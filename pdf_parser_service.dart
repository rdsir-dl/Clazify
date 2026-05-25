import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:syncfusion_flutter_pdf/pdf.dart';
import 'package:smart_timetable/features/timetable/data/models/timetable_entry.dart';

final pdfParserServiceProvider = Provider<PdfParserService>((ref) {
  return PdfParserService();
});

class PdfParserService {
  Future<List<TimetableEntry>> extractTimetable(String path, String trainerName) async {
    return await compute(_parsePdfInIsolate, _ParseParams(path, trainerName));
  }
}

class _ParseParams {
  final String path;
  final String trainerName;
  _ParseParams(this.path, this.trainerName);
}

List<TimetableEntry> _parsePdfInIsolate(_ParseParams params) {
  final File file = File(params.path);
  if (!file.existsSync()) {
    throw Exception("File not found");
  }

  final PdfDocument document = PdfDocument(inputBytes: file.readAsBytesSync());
  final List<TimetableEntry> entries = [];
  final PdfTextExtractor extractor = PdfTextExtractor(document);

  try {
    for (int i = 0; i < document.pages.count; i++) {
      // 1. Check if page contains trainer name (trim to handle extra spaces)
      final String pageText = extractor.extractText(startPageIndex: i, endPageIndex: i);
      debugPrint("Page $i text length: ${pageText.length}");
      if (!pageText.toLowerCase().contains(params.trainerName.trim().toLowerCase())) {
        debugPrint("Page $i does not contain trainer name: ${params.trainerName.trim()}");
        continue;
      }
      debugPrint("Found trainer name on Page $i");

      // 2. Extract Text Lines with text and bounds
      final List<TextLine> lines = extractor.extractTextLines(startPageIndex: i, endPageIndex: i);
      debugPrint("Extracted ${lines.length} lines on Page $i");
      
      // 3. Identify Grid Headers (Time and Days)
      List<TextLine> timeHeaders = [];
      List<TextLine> dayHeaders = [];
      
      // Heuristic: Days are usually Mon/Tue... Time usually has numbers/colons
      // We also look for "rows" and "columns"
      
      for (var line in lines) {
        final text = line.text.trim();
        debugPrint("Line: '$text'"); // Debug what the line actually contains
        if (_isDay(text)) {
          dayHeaders.add(line);
        } else if (_isTimeRange(text)) {
          timeHeaders.add(line);
        }
      }
      
      debugPrint("Found ${dayHeaders.length} day headers and ${timeHeaders.length} time headers");

      // If we found headers, process the grid
      if (timeHeaders.isNotEmpty && dayHeaders.isNotEmpty) {
        // Sort headers
        timeHeaders.sort((a, b) => a.bounds.left.compareTo(b.bounds.left));
        dayHeaders.sort((a, b) => a.bounds.top.compareTo(b.bounds.top));
        
        debugPrint("Time headers detected: ${timeHeaders.map((h) => h.text).join(', ')}");
        debugPrint("Day headers detected: ${dayHeaders.map((h) => h.text).join(', ')}");
        
        // CONTENT-FIRST APPROACH: Extract content, then match to headers
        
        // Filter content lines (exclude headers and metadata)
        final contentLines = lines.where((line) {
          return !timeHeaders.contains(line) &&
                 !dayHeaders.contains(line) &&
                 !line.text.contains('Teacher') &&
                 !line.text.contains('Timetable generated') &&
                 !line.text.contains('School of') &&
                 !RegExp(r'^\d+$').hasMatch(line.text.trim()); // Exclude lecture numbers
        }).toList();
        
        debugPrint("Found ${contentLines.length} content lines");
        
        // Group content by cell (same day + overlapping time column)
        Map<String, List<TextLine>> cellGroups = {};
        String? lastAssignedKey;
        
        for (var line in contentLines) {
          // Find nearest day header (by Y distance)
          TextLine? nearestDay;
          double minDayDist = double.infinity;
          for (var day in dayHeaders) {
            final dist = (line.bounds.top - day.bounds.top).abs();
            if (dist < minDayDist) {
              minDayDist = dist;
              nearestDay = day;
            }
          }
          
          // Find nearest time header (by X distance to line's LEFT edge)
          TextLine? nearestTime;
          double minTimeDist = double.infinity;
          for (var time in timeHeaders) {
            final dist = (line.bounds.left - time.bounds.left).abs();
            if (dist < minTimeDist) {
              minTimeDist = dist;
              nearestTime = time;
            }
          }
          
          String? key;
          if (nearestDay != null && nearestTime != null) {
            key = '${nearestDay.text}_${nearestTime.text}';
          }
          
          // Fix for "Group" lines: Associate with previous batch/subject if closely following
          // This handles cases where Group is slightly misaligned or falls into next slot
          if (line.text.trim().startsWith("Group") && lastAssignedKey != null) {
            debugPrint("merging '${line.text}' into previous cell: $lastAssignedKey");
            key = lastAssignedKey;
          }
          
          if (key != null) {
            cellGroups.putIfAbsent(key, () => []).add(line);
            lastAssignedKey = key;
          }
        }
        
        debugPrint("Grouped content into ${cellGroups.length} cells");
        
        // Process each cell group
        int entriesCreated = 0;
        
        for (var entry in cellGroups.entries) {
          final parts = entry.key.split('_');
          final dayText = parts[0];
          final timeText = parts[1];
          final cellLines = entry.value;
          
          // Sort lines by Y position (top to bottom)
          cellLines.sort((a, b) => a.bounds.top.compareTo(b.bounds.top));
          
          // Combine cell text
          final cellText = cellLines.map((l) => l.text.trim()).join('\n');
          debugPrint("Cell [$dayText][$timeText] text: $cellText");
          
          // Parse cell content
          final parsedContent = _parseCellContent(cellText);
          
          // Only create entry if we have meaningful content
          if (parsedContent.subject.isNotEmpty || parsedContent.batch.isNotEmpty) {
            final timeRange = _parseTimeRange(timeText);
            if (timeRange != null) {
              // Detect merged cells by checking content span
              final contentRightEdge = cellLines.map((l) => l.bounds.right).reduce((a, b) => a > b ? a : b);
              
              // Find current time header index
              final currentTimeHeader = timeHeaders.firstWhere((h) => h.text == timeText);
              final currentTimeIdx = timeHeaders.indexOf(currentTimeHeader);
              
              // Get next column position
              final currentRight = currentTimeHeader.bounds.right;
              final nextColumnLeft = (currentTimeIdx + 1 < timeHeaders.length)
                  ? timeHeaders[currentTimeIdx + 1].bounds.left
                  : currentRight + 100;
              
              // Merged if content extends significantly into next column
              final columnGap = nextColumnLeft - currentRight;
              final isMergedCell = contentRightEdge > (currentRight + columnGap * 0.5);
              final durationMinutes = isMergedCell ? 100 : 50;
              
              // Calculate end time
              final endTime = timeRange.start.add(Duration(minutes: durationMinutes));
              
              debugPrint("Content right: $contentRightEdge, Column right: $currentRight, Next: $nextColumnLeft, Merged: $isMergedCell, Duration: ${durationMinutes}min");
              
              entries.add(TimetableEntry()
                ..dayOfWeek = _normalizeDay(dayText)
                ..startTime = timeRange.start
                ..endTime = endTime
                ..subject = parsedContent.subject
                ..roomCode = parsedContent.room
                ..batch = parsedContent.batch
                ..group = parsedContent.group
              );
              entriesCreated++;
              debugPrint("Created entry: ${parsedContent.subject} - ${parsedContent.batch}");
            }
          }
        }
        
        debugPrint("Content extraction complete: $entriesCreated entries created");
        
        // Stop processing after finding trainer's page
        if (entries.isNotEmpty) {
          debugPrint("Finished processing trainer's page. Stopping...");
          break;
        }
      }
    }
  } catch (e) {
    debugPrint("Parsing Error: $e");
  } finally {
    document.dispose();
  }

  return entries;
}

// --- Helpers ---

bool _isDay(String text) {
  final days = [
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
    'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun',
    'mo', 'tu', 'we', 'th', 'fr', 'sa', 'su' // 2-letter abbreviations
  ];
  return days.contains(text.toLowerCase().replaceAll(RegExp(r'[^a-z]'), ''));
}

bool _isTimeRange(String text) {
  // Strict matching for time ranges (e.g., "9:30 - 10:20", "11:00-12:00")
  // Must match start and end times separated by a dash.
  // Allowed formats: H:MM, HH:MM, H, HH, or HMM, HHMM
  // We want to avoid matching strings like "Timetable generated: 05-12-2025"
  
  // Pattern components:
  // \d{1,2}(?::\d{2})?  => Matches 9, 09, 9:30, 09:30
  // \d{3,4}             => Matches 930, 1030 (fuzzy format)
  
  final timePart = r'(\d{1,2}:\d{2}|\d{1,2}|\d{3,4})';
  final pattern = '^$timePart\\s*-\\s*$timePart\$';
  
  return RegExp(pattern).hasMatch(text.trim());
}

// Find nearest header that covers the content bounds
TextLine? _findNearestDay(TextLine content, List<TextLine> days, bool daysAreRows) {
  if (daysAreRows) {
    // Days are rows: check Y overlap
    return days.where((day) {
      final center = content.bounds.top + content.bounds.height / 2;
      return center >= day.bounds.top - 10 && center <= day.bounds.bottom + 10;
    }).firstOrNull;
  } else {
    // Days are columns: check X overlap
    return days.where((day) {
      final center = content.bounds.left + content.bounds.width / 2;
      return center >= day.bounds.left - 10 && center <= day.bounds.right + 10;
    }).firstOrNull;
  }
}

String _normalizeDay(String raw) {
  final lower = raw.trim().toLowerCase();
  if (lower.startsWith('mo')) return 'Monday';
  if (lower.startsWith('tu')) return 'Tuesday';
  if (lower.startsWith('we')) return 'Wednesday';
  if (lower.startsWith('th')) return 'Thursday';
  if (lower.startsWith('fr')) return 'Friday';
  if (lower.startsWith('sa')) return 'Saturday';
  if (lower.startsWith('su')) return 'Sunday';
  return raw;
}

TextLine? _findNearestTime(TextLine content, List<TextLine> times, bool daysAreRows) {
  if (daysAreRows) {
    // Days are rows, Times are columns: check X overlap
    return times.where((time) {
      final center = content.bounds.left + content.bounds.width / 2;
      return center >= time.bounds.left - 10 && center <= time.bounds.right + 10;
    }).firstOrNull;
  } else {
    // Days are columns, Times are rows: check Y overlap
    return times.where((time) {
      final center = content.bounds.top + content.bounds.height / 2;
      return center >= time.bounds.top - 10 && center <= time.bounds.bottom + 10;
    }).firstOrNull;
  }
}

class _ParsedTime { DateTime start; DateTime end; _ParsedTime(this.start, this.end); }

_ParsedTime? _parseTimeRange(String text) {
  // "1110-12::00", "230-3::20"
  final clean = text.replaceAll(RegExp(r'[^0-9\-]'), '');
  final parts = clean.split('-');
  if (parts.length != 2) return null;

  final start = _parseFuzzyTime(parts[0]);
  final end = _parseFuzzyTime(parts[1]);
  
  // Adjust PM logic (School: if < 7 assume PM)
  // But 11:00 is AM. 12:00 is PM. 1:00 (13:00) is PM.
  // 1110 -> 11:10 (AM). 1200 -> 12:00 (PM).
  // 230 -> 2:30. Is it 02:30 or 14:30? School context -> 14:30.
  
  if (start != null && end != null) {
      // Hacky PM adjustment
      final sH = start.hour + (start.hour < 7 ? 12 : 0);
      final eH = end.hour + (end.hour < 7 ? 12 : 0);
      
      final now = DateTime.now();
      return _ParsedTime(
        DateTime(now.year, now.month, now.day, sH, start.minute),
        DateTime(now.year, now.month, now.day, eH, end.minute),
      );
  }
  return null;
}

DateTime? _parseFuzzyTime(String raw) {
  // 1110 -> 11:10
  // 230 -> 2:30
  // 8 -> 8:00
  if (raw.isEmpty) return null;
  
  int val = int.tryParse(raw) ?? -1;
  if (val == -1) return null;
  
  int h = 0;
  int m = 0;
  
  if (raw.length >= 3) {
    // Last 2 are minutes
    m = val % 100;
    h = val ~/ 100;
  } else {
    // 2 or 1 digit -> Hour
    h = val;
    m = 0;
  }
  
  return DateTime(2024, 1, 1, h, m);
}

class _Content { String subject; String room; String batch; String? group; _Content(this.subject, this.room, this.batch, this.group); }

_Content _parseCellContent(String text) {
  // Actual PDF structure based on logs:
  // Line 1: "DMS RJ310R" (subject + room on same line, separated by space)
  // Line 2: "BCA-3A" (batch with dash)
  // Line 3: "Group 2" (optional, contains "Group")
  
  final lines = text.split('\n').map((l) => l.trim()).where((l) => l.isNotEmpty).toList();
  String batch = "";
  String room = "";
  String subject = "";
  String? group;
  
  for (var line in lines) {
    if (line.contains("Group")) {
      group = line;
    } else if (line.contains("-") && !line.contains(" ")) {
      // Batch: contains dash but no spaces (e.g., "BE-CSE-5D")
      batch = line;
    } else {
      // This line might contain subject + room
      // Room pattern: matches various formats like CL03, CVR311R, RJ310R, A, CVR009R, etc.
      // Pattern: 1-4 uppercase letters followed by 1-4 digits, optionally ending with R
      final roomMatch = RegExp(r'\b([A-Z]{1,4}\d{1,4}R?)\b').firstMatch(line);
      
      if (roomMatch != null) {
        room = roomMatch.group(0)!;
        // Subject is everything before the room
        subject = line.substring(0, roomMatch.start).trim();
        
        debugPrint("Parsed line '$line': subject='$subject', room='$room'");
        
        // If subject is empty, check if there's text after room
        if (subject.isEmpty && roomMatch.end < line.length) {
          subject = line.substring(roomMatch.end).trim();
        }
      } else {
        // No room found, entire line is subject
        subject = "$subject $line".trim();
      }
    }
  }
  
  debugPrint("Final parsed: subject='$subject', room='$room', batch='$batch', group='$group'");
  return _Content(subject, room, batch, group);
}

extension IterableExtension<T> on Iterable<T> {
  T? get firstOrNull => isEmpty ? null : first;
}

