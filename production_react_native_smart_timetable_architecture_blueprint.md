# Production-Grade Architecture Blueprint
## Smart Timetable / Clazify Re-Architecture (React Native + Native Android + Node.js)

---

# 1. Vision & Product Goal

## Product Objective

Build a highly reliable, lightweight, offline-first academic timetable and smart alarm system for trainers/teachers.

The application must:

- Parse institutional timetable PDFs
- Generate structured schedules automatically
- Schedule exact native alarms reliably
- Work offline after synchronization
- Handle attendance tracking
- Support Android foreground alarm behavior
- Remain lightweight and battery efficient
- Be scalable for future cloud features

---

# 2. Core Engineering Principles

## Mandatory Principles

### A. Offline-First
Core features must work without internet:

- alarms
- attendance
- timetable viewing
- lecture reminders
- local persistence

Internet should only enhance:

- sync
- PDF parsing
- backups
- analytics

---

### B. Native-Controlled Reliability

All reliability-critical alarm behavior must remain fully native Android.

React Native MUST NOT control:

- ringing lifecycle
- exact scheduling
- wake locks
- foreground service lifecycle
- alarm auto-stop timers

---

### C. Thin Frontend Philosophy

Frontend should only:

- render UI
- collect user input
- orchestrate flows
- call APIs
- communicate with native modules

Heavy processing must stay outside frontend.

---

### D. Modular Feature Isolation

Every major feature must be independently maintainable.

Features should not tightly couple.

---

# 3. Final Production Architecture

```text
┌────────────────────────────────────┐
│         React Native App           │
│                                    │
│ UI + State + Offline Storage       │
│ Navigation + Attendance            │
└────────────────┬───────────────────┘
                 │
                 ▼
┌────────────────────────────────────┐
│     Native Android Alarm Engine    │
│                                    │
│ AlarmManager                       │
│ Foreground Service                 │
│ WakeLock                           │
│ Full-Screen Notification           │
│ Exact Alarm Scheduling             │
└────────────────┬───────────────────┘
                 │
                 ▼
┌────────────────────────────────────┐
│         Node.js Cloud API          │
│                                    │
│ PDF Parsing                        │
│ Timetable Extraction               │
│ Sync APIs                          │
│ Backup APIs                        │
└────────────────────────────────────┘
```

---

# 4. Technology Stack

# Frontend

## Core

- React Native
- TypeScript

## Recommended Libraries

### Navigation
- React Navigation

### State Management
- Zustand

### Local Database
- SQLite

### Networking
- Axios

### Forms
- React Hook Form

### Validation
- Zod

### Animations
- React Native Reanimated

### Date Utilities
- Day.js

### File Upload
- react-native-document-picker

### Notifications (fallback only)
- react-native-push-notification

---

# Native Android Layer

## Language
- Kotlin

## Native Components

### AlarmManager
Used for exact scheduling.

### Foreground Service
Used for active ringing state.

### Broadcast Receivers
- AlarmReceiver
- BootReceiver
- DismissReceiver

### WakeLock
Used for guaranteed CPU wake.

### Notification Channels
High-priority alarm category.

---

# Backend

## Runtime
- Node.js

## Framework
- Express.js

## Parsing Strategy
- TypeScript-based parser
- pdfjs-dist
- custom coordinate reconstruction
- direct port of proven Flutter parser heuristics

## Important Architectural Rule
The parser must NOT be rewritten conceptually.

The existing Flutter parser logic must be ported algorithm-by-algorithm into TypeScript.

This includes preserving:

- nearest header detection
- coordinate proximity logic
- merged cell heuristics
- fuzzy time parsing
- multiline group merging
- timetable grid mapping
- trainer-page filtering

The parser is now considered a core domain engine.

## Storage
Initially:
- no database required

Later:
- PostgreSQL

---

# Hosting

## Initial Deployment
- Render

## Future Scaling
- Railway
- DigitalOcean
- AWS

---

# 5. Frontend Folder Structure

```text
src/
├── app/
│   ├── navigation/
│   ├── providers/
│   └── theme/
│
├── features/
│   ├── timetable/
│   ├── attendance/
│   ├── alarms/
│   ├── settings/
│   └── sync/
│
├── shared/
│   ├── components/
│   ├── hooks/
│   ├── utils/
│   ├── constants/
│   └── types/
│
├── services/
│   ├── api/
│   ├── storage/
│   ├── native/
│   └── sync/
│
├── database/
│   ├── sqlite/
│   ├── repositories/
│   └── migrations/
│
└── native-bridge/
    └── alarm-module/
```

---

# 6. Native Android Architecture

# Goal

Android layer becomes a dedicated alarm engine.

React Native should simply issue commands.

---

# Native Modules

## A. AlarmSchedulerModule

Responsibilities:

- schedule exact alarms
- cancel alarms
- reschedule alarms
- restore alarms after reboot

Exposed APIs:

```text
scheduleAlarm()
cancelAlarm()
rescheduleAll()
stopAlarm()
```

---

## B. AlarmReceiver

Responsibilities:

- receive alarm trigger
- acquire WakeLock
- launch foreground service

---

## C. AlarmForegroundService

Responsibilities:

- play ringtone
- start vibration
- show persistent notification
- show full-screen intent
- auto-stop after 30 seconds
- handle manual dismissal

---

## D. AlarmDismissReceiver

Responsibilities:

- stop ringtone
- stop vibration
- destroy foreground service
- cancel notification

---

## E. BootReceiver

Responsibilities:

- detect reboot
- reload alarms from SQLite
- reschedule all alarms

---

# 7. Alarm Reliability Rules

# Mandatory Reliability Features

## Exact Alarm Permission

Must request:

```xml
SCHEDULE_EXACT_ALARM
```

Runtime validation required.

---

## WakeLock

Foreground service MUST acquire temporary WakeLock.

Purpose:

- prevent CPU sleep
- guarantee execution

---

## Full-Screen Intent Notification

Alarm notifications must:

- wake screen
- bypass lockscreen restrictions
- behave like real alarm apps

---

## Foreground Service

Alarm must run as foreground service.

Never rely on JS timers.

---

## Battery Optimization Exemption

App must prompt users to disable battery optimization.

Critical for:

- Xiaomi
- Vivo
- Oppo
- Samsung

---

# 8. Local Database Design

# Database Choice

SQLite

Reason:

- lightweight
- reliable
- offline-first
- relational queries
- stable ecosystem

---

# Tables

## timetable_entries

```text
id
subject
room_code
batch
group_name
day_of_week
start_time
end_time
lecture_number
alarm_enabled
created_at
updated_at
```

---

## attendance_records

```text
id
batch
group_name
subject
date
present_count
total_count
created_at
```

---

## app_settings

```text
id
trainer_name
lead_time_normal
lead_time_consecutive
auto_stop_seconds
battery_optimization_ignored
last_sync_at
```

---

## scheduled_alarms

```text
id
lecture_id
trigger_timestamp
status
native_alarm_id
created_at
```

---

# 9. Backend Architecture

# Backend Responsibilities

Backend should ONLY handle:

- PDF parsing
- timetable extraction
- sync APIs
- backup APIs
- Google Sheets integration
- attendance metadata fetching

NOT alarms.

---

# Google Sheets Integration

## Purpose

The backend must integrate with Google Sheets APIs to fetch:

- total student strength
- batch metadata
- attendance configuration data

This logic must remain backend-side.

React Native frontend must NEVER directly access Google Sheets APIs.

Reason:

- API security
- centralized validation
- easier schema evolution
- easier caching
- lower frontend complexity

---

# Recommended Google Sheet Schema

| Batch | Group | Subject | Total Students |
|---|---|---|---|
| BE-CSE-5D | G1 | Java | 58 |

---

# Recommended API Endpoint

```http
GET /api/v1/student-strength
```

Example Response:

```json
{
  "batch": "BE-CSE-5D",
  "group": "G1",
  "subject": "Java",
  "totalStudents": 58
}
```

---

# API Design

## Upload PDF

```http
POST /api/v1/timetable/upload
```

Input:
- PDF file
- trainer name

Output:
- parsed timetable JSON

---

## Fetch Backup

```http
GET /api/v1/timetable/backup
```

---

## Upload Backup

```http
POST /api/v1/timetable/backup
```

---

# 10. PDF Parsing Engine

# Parsing Strategy

The parser architecture must preserve the proven extraction heuristics from the original Flutter implementation.

This parser is considered a business-critical subsystem.

Accuracy is prioritized over architectural purity.

---

# Parsing Engine Rules

## The parser MUST:

1. Extract text blocks with geometry
2. Reconstruct text lines from PDF coordinates
3. Detect trainer-specific pages
4. Detect day headers
5. Detect time headers
6. Map content using coordinate proximity
7. Merge multiline cells
8. Merge split group rows
9. Detect merged lecture periods
10. Parse fuzzy academic time formats
11. Generate normalized timetable JSON

---

# Parser Technical Migration Rules

## The existing Flutter parser logic must be ported into TypeScript.

The following heuristics are mandatory:

### Day Detection
- normalized weekday matching
- abbreviation support

### Time Parsing
- fuzzy timetable time parsing
- malformed separator tolerance
- PM correction heuristics

### Cell Grouping
- nearest-header coordinate mapping
- X/Y proximity matching

### Group Merging
- merge lines beginning with "Group"
- attach to previous logical timetable cell

### Merged Cell Detection
- detect content overflow into adjacent time columns
- dynamically infer lecture duration

---

# Recommended Parser Stack

## Libraries

- pdfjs-dist
- custom TypeScript geometry engine

---

# Important Architectural Decision

The parser should remain fully backend-side.

Reasons:

- lighter mobile app
- easier debugging
- centralized parser improvements
- easier regression testing
- safer heavy processing

---

# Parser Validation System

A parser validation suite is mandatory.

The system must:

1. Store sample PDFs
2. Store expected timetable JSON outputs
3. Compare parser outputs automatically
4. Detect regressions during future parser changes

---

# Migration Strategy

## Phase 1
Port parser exactly without optimization.

## Phase 2
Validate outputs against Flutter parser.

## Phase 3
Refactor only after output parity is achieved.

---

# Parsing Output Format

```json
{
  "lectures": [
    {
      "subject": "Java",
      "batch": "BE-CSE-5D",
      "group": "Group 1",
      "room": "A-203",
      "day": "Monday",
      "startTime": "10:00",
      "endTime": "10:50"
    }
  ]
}
```

---

# Parsing Output Format

```json
{
  "lectures": [
    {
      "subject": "Java",
      "batch": "BE-CSE-5D",
      "group": "Group 1",
      "room": "A-203",
      "day": "Monday",
      "startTime": "10:00",
      "endTime": "10:50"
    }
  ]
}
```

---

# 11. Smart Alarm Scheduling Rules

# Consecutive Lecture Logic

If:

```text
gap_between_classes < 20 minutes
```

Use:

```text
lead_time_consecutive
```

Else:

```text
lead_time_normal
```

---

# Weekly Recurrence Logic

If computed alarm time already passed:

```text
schedule += 7 days
```

---

# Duplicate Prevention

Before scheduling:

- check existing alarm
- cancel old instance
- replace safely

---

# 12. UI Architecture

# Screens

## HomeScreen

Features:

- lecture timeline
- ringing banner
- current day schedule
- quick actions

---

## SettingsScreen

Features:

- trainer configuration
- alarm settings
- sync controls
- battery optimization status

---

## AttendanceScreen

Features:

- attendance entry
- batch selection
- history
- edit records

---

## PDFImportScreen

Features:

- upload progress
- parsing status
- validation preview
- import confirmation

---

# 13. Performance Rules

# Mandatory Rules

## Avoid Large JS Processing

Never parse PDFs inside React Native.

---

## Avoid Continuous Background JS

No persistent JS timers.

---

## Minimize Re-Renders

Use:

- memoization
- Zustand selectors
- FlatList virtualization

---

## Lazy Load Screens

Use code splitting.

---

# 14. Security Rules

# Mandatory

## Never expose API keys in frontend.

---

## Validate uploaded PDFs.

---

## Sanitize parser output.

---

## Use HTTPS only.

---

# 15. Deployment Strategy

# Phase 1

## Backend
Deploy to:
- Render Free Tier

## Mobile
Android only.

---

# Phase 2

Add:

- cloud backups
- user accounts
- analytics

---

# Phase 3

Add:

- AI timetable correction
- OCR support
- institution dashboards
- multi-teacher support

---

# 16. Production Priorities

# Highest Priority

## Alarm Reliability

Nothing is more important.

---

# Second Priority

## PDF Parsing Accuracy

---

# Third Priority

## Offline Stability

---

# Fourth Priority

## Lightweight Performance

---

# 17. Non-Negotiable Rules

# DO NOT

## Do not use JS timers for alarm lifecycle.

## Do not depend on cloud for alarms.

## Do not parse large PDFs on mobile.

## Do not tightly couple frontend with parser logic.

## Do not schedule alarms without exact alarm permission checks.

---

# 18. Final Engineering Philosophy

The application should behave like:

- a native Android alarm app
- with a modern React Native frontend
- powered by a lightweight cloud parsing backend

Core philosophy:

```text
UI in React Native
Reliability in Native Android
Heavy Processing in Backend
```

This separation is the foundation of a scalable, production-grade architecture.

