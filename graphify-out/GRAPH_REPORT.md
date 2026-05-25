# Graph Report - Clazify-main  (2026-05-25)

## Corpus Check
- 57 files · ~133,142 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 305 nodes · 346 edges · 25 communities detected
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]

## God Nodes (most connected - your core abstractions)
1. `package:flutter_riverpod/flutter_riverpod.dart` - 16 edges
2. `package:smart_timetable/features/timetable/data/models/timetable_entry.dart` - 8 edges
3. `package:isar/isar.dart` - 8 edges
4. `Create()` - 7 edges
5. `AlarmNotificationHelper` - 6 edges
6. `AlarmSchedulerPlugin` - 6 edges
7. `package:flutter/material.dart` - 6 edges
8. `Destroy()` - 6 edges
9. `PDF` - 5 edges
10. `AlarmService` - 5 edges

## Surprising Connections (you probably didn't know these)
- `OnCreate()` --calls--> `RegisterPlugins()`  [INFERRED]
  windows\runner\flutter_window.cpp → windows\flutter\generated_plugin_registrant.cc
- `OnCreate()` --calls--> `Show()`  [INFERRED]
  windows\runner\flutter_window.cpp → windows\runner\win32_window.cpp
- `wWinMain()` --calls--> `CreateAndAttachConsole()`  [INFERRED]
  windows\runner\main.cpp → windows\runner\utils.cpp
- `wWinMain()` --calls--> `Create()`  [INFERRED]
  windows\runner\main.cpp → windows\runner\win32_window.cpp
- `wWinMain()` --calls--> `SetQuitOnClose()`  [INFERRED]
  windows\runner\main.cpp → windows\runner\win32_window.cpp

## Communities

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (28): AlarmService, cancelAlarmsForEntries, _nextInstance, DatabaseService, FilePickerService, AppSettings, SettingsRepositoryImpl, SettingsRepository (+20 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (30): dart:async, dart:typed_data, dispose, NotificationService, _onNotificationTapped, _scheduleAutoStop, stopAlarm, AnimatedBuilder (+22 more)

### Community 2 - "Community 2"
Cohesion: 0.09
Nodes (22): dart:convert, dart:io, SyncService, build, Divider, initState, _save, Scaffold (+14 more)

### Community 3 - "Community 3"
Cohesion: 0.15
Nodes (19): OnCreate(), RegisterPlugins(), Create(), Destroy(), EnableFullDpiSupportIfAvailable(), GetClientArea(), GetThisFromHandle(), GetWindowClass() (+11 more)

### Community 4 - "Community 4"
Cohesion: 0.09
Nodes (21): _batchMetadataAttach, _batchMetadataDeserialize, _batchMetadataEstimateSize, _batchMetadataGetId, _batchMetadataSerialize, deleteAllByIdentifierSync, deleteAllByIndex, deleteAllByIndexSync (+13 more)

### Community 5 - "Community 5"
Cohesion: 0.12
Nodes (16): TimetableRepository, build, _buildInfoChip, _buildStudentField, Column, Container, Function, _getAutoLectureNumber (+8 more)

### Community 6 - "Community 6"
Cohesion: 0.12
Nodes (16): build, DynamicColorBuilder, main, MaterialApp, MyApp, NotificationService, main, ProviderScope (+8 more)

### Community 7 - "Community 7"
Cohesion: 0.13
Nodes (14): compute, _Content, DateTime, Exception, _isDay, _isTimeRange, _normalizeDay, _parseCellContent (+6 more)

### Community 8 - "Community 8"
Cohesion: 0.14
Nodes (6): dispose, fl_register_plugins(), main(), my_application_activate(), my_application_dispose(), my_application_new()

### Community 9 - "Community 9"
Cohesion: 0.43
Nodes (4): FPDF, create_pdf(), PDF, strip_non_latin()

### Community 10 - "Community 10"
Cohesion: 0.29
Nodes (1): AlarmNotificationHelper

### Community 11 - "Community 11"
Cohesion: 0.29
Nodes (1): AlarmSchedulerPlugin

### Community 12 - "Community 12"
Cohesion: 0.29
Nodes (1): AlarmService

### Community 13 - "Community 13"
Cohesion: 0.29
Nodes (6): _appSettingsAttach, _appSettingsDeserialize, _appSettingsEstimateSize, _appSettingsGetId, _appSettingsSerialize, IsarError

### Community 14 - "Community 14"
Cohesion: 0.29
Nodes (6): _attendanceRecordAttach, _attendanceRecordDeserialize, _attendanceRecordEstimateSize, _attendanceRecordGetId, _attendanceRecordSerialize, IsarError

### Community 15 - "Community 15"
Cohesion: 0.29
Nodes (6): IsarError, _timetableEntryAttach, _timetableEntryDeserialize, _timetableEntryEstimateSize, _timetableEntryGetId, _timetableEntrySerialize

### Community 16 - "Community 16"
Cohesion: 0.38
Nodes (5): wWinMain(), CreateAndAttachConsole(), GetCommandLineArguments(), Utf8FromUtf16(), SetQuitOnClose()

### Community 17 - "Community 17"
Cohesion: 0.33
Nodes (2): AppDelegate, FlutterAppDelegate

### Community 18 - "Community 18"
Cohesion: 0.33
Nodes (3): RegisterGeneratedPlugins(), MainFlutterWindow, NSWindow

### Community 19 - "Community 19"
Cohesion: 0.4
Nodes (2): RunnerTests, XCTestCase

### Community 20 - "Community 20"
Cohesion: 0.4
Nodes (1): FlutterWindow()

### Community 21 - "Community 21"
Cohesion: 0.67
Nodes (1): AlarmDismissReceiver

### Community 22 - "Community 22"
Cohesion: 0.67
Nodes (1): AlarmReceiver

### Community 23 - "Community 23"
Cohesion: 0.67
Nodes (1): MainActivity

### Community 24 - "Community 24"
Cohesion: 0.67
Nodes (2): NativeAlarmService, package:flutter/services.dart

## Knowledge Gaps
- **143 isolated node(s):** `MyApp`, `main`, `NotificationService`, `build`, `DynamicColorBuilder` (+138 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 10`** (7 nodes): `AlarmNotificationHelper`, `.createForegroundNotification()`, `.createNotificationChannel()`, `.dismissNotification()`, `.startVibration()`, `.stopVibration()`, `AlarmNotificationHelper.kt`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 11`** (7 nodes): `AlarmSchedulerPlugin`, `.cancelAlarm()`, `.onAttachedToEngine()`, `.onDetachedFromEngine()`, `.onMethodCall()`, `.scheduleAlarm()`, `AlarmSchedulerPlugin.kt`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 12`** (7 nodes): `AlarmService`, `.onBind()`, `.onCreate()`, `.onDestroy()`, `.onStartCommand()`, `stopService()`, `AlarmService.kt`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (6 nodes): `AppDelegate`, `.application()`, `.applicationShouldTerminateAfterLastWindowClosed()`, `FlutterAppDelegate`, `AppDelegate.swift`, `AppDelegate.swift`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (5 nodes): `RunnerTests.swift`, `RunnerTests.swift`, `RunnerTests`, `.testExample()`, `XCTestCase`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (5 nodes): `FlutterWindow()`, `MessageHandler()`, `OnDestroy()`, `flutter_window.cpp`, `flutter_window.h`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (3 nodes): `AlarmDismissReceiver`, `.onReceive()`, `AlarmDismissReceiver.kt`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (3 nodes): `AlarmReceiver`, `.onReceive()`, `AlarmReceiver.kt`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (3 nodes): `MainActivity.kt`, `MainActivity`, `.configureFlutterEngine()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (3 nodes): `NativeAlarmService`, `native_alarm_service.dart`, `package:flutter/services.dart`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `package:flutter_riverpod/flutter_riverpod.dart` connect `Community 0` to `Community 1`, `Community 2`, `Community 5`, `Community 6`, `Community 7`?**
  _High betweenness centrality (0.157) - this node is a cross-community bridge._
- **Why does `dispose` connect `Community 8` to `Community 1`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **What connects `MyApp`, `main`, `NotificationService` to the rest of the system?**
  _143 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._