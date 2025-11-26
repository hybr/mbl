# Architecture Diagrams

Visual representations of the MiniApp System architecture.

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser / Capacitor                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                    App (app.js)                       │  │
│  │  - Initialization                                     │  │
│  │  - UI Controls                                        │  │
│  │  - Event Handlers                                     │  │
│  └─────────────────────┬────────────────────────────────┘  │
│                        │                                    │
│  ┌─────────────────────▼────────────────────────────────┐  │
│  │                  AppManager                           │  │
│  │  ┌──────────────┐  ┌──────────────┐                  │  │
│  │  │   Registry   │  │  Instances   │                  │  │
│  │  │  (Classes)   │  │  (Objects)   │                  │  │
│  │  └──────────────┘  └──────────────┘                  │  │
│  └─────────┬───────────────┬──────────────┬─────────────┘  │
│            │               │              │                │
│  ┌─────────▼──┐  ┌────────▼───┐  ┌───────▼─────┐         │
│  │  NotesApp  │  │  TasksApp  │  │ SettingsApp │         │
│  │  (MiniApp) │  │  (MiniApp) │  │  (MiniApp)  │         │
│  └─────┬──────┘  └──────┬─────┘  └──────┬──────┘         │
│        │                │                │                │
│  ┌─────▼────────────────▼────────────────▼──────┐         │
│  │              EventBus (Global)                │         │
│  │  - Inter-app communication                    │         │
│  │  - System events                              │         │
│  └─────────────────────┬─────────────────────────┘         │
│                        │                                   │
│  ┌─────────────────────▼─────────────────────────┐         │
│  │            DatabaseManager                     │         │
│  │  ┌──────────────┐  ┌──────────────┐           │         │
│  │  │   PouchDB    │  │  Change      │           │         │
│  │  │  (IndexedDB) │  │  Listener    │           │         │
│  │  └──────┬───────┘  └──────┬───────┘           │         │
│  └─────────┼──────────────────┼───────────────────┘         │
│            │                  │                             │
│  ┌─────────▼──────────────────▼───────────┐                │
│  │          Browser IndexedDB              │                │
│  └─────────────────┬─────────────────────┘                 │
└────────────────────┼───────────────────────────────────────┘
                     │ Sync
                     ▼
            ┌─────────────────┐
            │    CouchDB      │
            │   (Optional)    │
            └─────────────────┘
```

## MiniApp Lifecycle

```
┌─────────────────────────────────────────────────────┐
│                  MiniApp Lifecycle                   │
└─────────────────────────────────────────────────────┘

    new MiniApp(options)
           │
           ▼
    ┌──────────────┐
    │ Constructor  │  - Set properties
    │              │  - Initialize state
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │   init()     │  - Find/create container
    │              │  - Subscribe to data
    └──────┬───────┘  - Setup listeners
           │
           ▼
    ┌──────────────┐
    │  onInit()    │  - Custom initialization
    │  (override)  │  - Load data
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │  render()    │  - Call onRender()
    │              │  - Build DOM tree
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │  onRender()  │  - Create UI elements
    │  (override)  │  - Attach event handlers
    └──────┬───────┘  - Mount components
           │
           ▼
    ┌──────────────┐
    │   Active     │  ◄─── Process events
    │              │  ◄─── Handle data changes
    │              │  ◄─── Update UI
    └──────┬───────┘
           │ hide() / show()
           ▼
    ┌──────────────┐
    │  Inactive    │  - No event processing
    │              │  - Paused updates
    └──────┬───────┘
           │ destroy()
           ▼
    ┌──────────────┐
    │ onDestroy()  │  - Custom cleanup
    │  (override)  │
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │  destroy()   │  - Unsubscribe events
    │              │  - Remove DOM listeners
    │              │  - Clear container
    └──────┬───────┘  - Release references
           │
           ▼
    Garbage Collected
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      Write Operation                         │
└─────────────────────────────────────────────────────────────┘

User Input
    │
    ▼
┌─────────────┐
│  MiniApp    │ - Validate input
│             │ - Create document
└──────┬──────┘
       │ db.create(doc)
       ▼
┌─────────────┐
│ Database    │ - Add timestamps
│  Manager    │ - Generate _rev
└──────┬──────┘
       │ PouchDB.put()
       ▼
┌─────────────┐
│  PouchDB    │ - Store locally
│             │ - Trigger change
└──────┬──────┘
       │
       ├─────────────────┐
       │                 │
       ▼                 ▼
┌─────────────┐   ┌─────────────┐
│ IndexedDB   │   │  CouchDB    │ (if online)
│  (Local)    │   │  (Remote)   │
└─────────────┘   └─────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      Read / Update Flow                      │
└─────────────────────────────────────────────────────────────┘

Data Change (Local or Remote)
       │
       ▼
┌─────────────┐
│  PouchDB    │ - Detect change
│   Changes   │
└──────┬──────┘
       │ change event
       ▼
┌─────────────┐
│ Database    │ - Identify type
│  Manager    │ - Route to subscribers
└──────┬──────┘
       │
       ├──────────────┬──────────────┐
       │              │              │
       ▼              ▼              ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ MiniApp A   │ │ MiniApp B   │ │ MiniApp C   │
│ onData      │ │ onData      │ │ onData      │
│ Changed()   │ │ Changed()   │ │ Changed()   │
└──────┬──────┘ └──────┬──────┘ └──────┬──────┘
       │              │              │
       ▼              ▼              ▼
    Update UI     Update UI      Update UI
   (Real-time)   (Real-time)    (Real-time)
```

## Event Communication

```
┌─────────────────────────────────────────────────────────────┐
│                   EventBus Communication                     │
└─────────────────────────────────────────────────────────────┘

Publisher (MiniApp A)
       │
       │ this.emit('event:name', data)
       ▼
┌─────────────────┐
│    EventBus     │
│  ┌───────────┐  │
│  │ Listeners │  │
│  │    Map    │  │
│  └───────────┘  │
└────────┬────────┘
         │
         ├──────────────┬──────────────┬──────────────┐
         │              │              │              │
         ▼              ▼              ▼              ▼
  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
  │ MiniApp A  │ │ MiniApp B  │ │ MiniApp C  │ │ MiniApp D  │
  │ (skip self)│ │ callback() │ │ callback() │ │ callback() │
  └────────────┘ └────────────┘ └────────────┘ └────────────┘

Example Events:
- note:created        → TasksApp creates task from note
- task:completed      → NotificationApp shows success
- user:login          → All apps update user context
- sync:error          → SettingsApp shows alert
- network:offline     → All apps show offline indicator
```

## Component Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                     Component Structure                      │
└─────────────────────────────────────────────────────────────┘

                    Component (Base)
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
     Button            Input             List
        │                │                │
        │                │                └─── renderItem()
        │                │
        │                └─── onChange / onEnter
        │
        └─── onClick

Used by MiniApps:

┌──────────────────────────────────────────┐
│           NotesApp                        │
├──────────────────────────────────────────┤
│  ┌─────────────────────────────────┐    │
│  │ Input (title)                   │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │ Input (content)                 │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │ Button (Add Note)               │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │ List                            │    │
│  │  ├─ Note Item 1                 │    │
│  │  │   └─ Button (Delete)         │    │
│  │  ├─ Note Item 2                 │    │
│  │  └─ Note Item 3                 │    │
│  └─────────────────────────────────┘    │
└──────────────────────────────────────────┘
```

## Memory Management

```
┌─────────────────────────────────────────────────────────────┐
│               Automatic Cleanup on Destroy                   │
└─────────────────────────────────────────────────────────────┘

MiniApp Instance
    │
    ├─► EventBus Subscriptions [ ]
    │   └─► Automatically unsubscribed on destroy()
    │
    ├─► Database Subscriptions [ ]
    │   └─► Automatically unsubscribed on destroy()
    │
    ├─► DOM Event Listeners [ ]
    │   └─► Tracked via addEventListener()
    │       └─► Automatically removed on destroy()
    │
    ├─► Child Components [ ]
    │   └─► Cascading destroy() calls
    │
    └─► DOM Container
        └─► Cleared and dereferenced

Result: Zero Memory Leaks!
```

## Scaling Pattern

```
┌─────────────────────────────────────────────────────────────┐
│            How the System Scales to 100+ MiniApps           │
└─────────────────────────────────────────────────────────────┘

AppManager
    │
    ├─► Registry: Map<className, MiniAppClass>
    │   │
    │   ├─── NotesApp (class reference ~1KB)
    │   ├─── TasksApp (class reference ~1KB)
    │   ├─── ChatApp (class reference ~1KB)
    │   ├─── ...
    │   └─── 97 more classes (~97KB)
    │
    │   Total Registry: ~100KB
    │
    └─► Instances: Map<id, MiniAppInstance>
        │
        ├─── NotesApp#1 (active, ~50KB)
        ├─── TasksApp#1 (active, ~50KB)
        ├─── TasksApp#2 (inactive, paused)
        ├─── ChatApp#1 (active, ~50KB)
        ├─── SettingsApp#1 (inactive, paused)
        │
        └─── Only 3 active consuming CPU

        Total Instances: ~200KB (5 instances)

Total Memory: 100KB + 200KB = 300KB

KEY INSIGHT:
- Classes are tiny (just function definitions)
- Inactive instances don't process events
- Only mount what you need
- Unmount when done (garbage collected)
```

## Request Flow (End-to-End)

```
┌─────────────────────────────────────────────────────────────┐
│           Example: User Creates a Note                       │
└─────────────────────────────────────────────────────────────┘

1. User types text and clicks "Add Note"
   │
   ▼
2. Button onClick → NotesApp.addNote()
   │
   ▼
3. NotesApp validates input
   │
   ▼
4. NotesApp.db.create({ type: 'note', ... })
   │
   ▼
5. DatabaseManager.create()
   │  - Adds timestamps
   │  - Calls PouchDB.put()
   ▼
6. PouchDB writes to IndexedDB
   │
   ├─► If online: Syncs to CouchDB
   │
   └─► Triggers change event
       │
       ▼
7. DatabaseManager.changeListener
   │  - Receives change
   │  - Checks document type: 'note'
   │
   ▼
8. DatabaseManager.notifySubscribers('note')
   │
   ├─► NotesApp.onDataChanged(change)
   │   │  - Updates local array
   │   │  - Re-renders list
   │   └─► UI updated (50ms)
   │
   └─► EventBus.emit('db:change', change)
       │
       └─► Any other app listening
           └─► Updates if interested

Total time: < 100ms (offline)
Real-time: All subscribed apps update instantly!
```

## Offline-to-Online Flow

```
┌─────────────────────────────────────────────────────────────┐
│              Offline to Online Synchronization               │
└─────────────────────────────────────────────────────────────┘

OFFLINE STATE:
    User creates 10 notes
         │
         ▼
    PouchDB (Local)
         │
         └─► All stored in IndexedDB

NETWORK RETURNS:
    'online' event fires
         │
         ▼
    DatabaseManager detects online
         │
         ▼
    Starts/Resumes CouchDB sync
         │
         ▼
    PouchDB compares local vs remote
         │
         ├─► Push local changes (10 notes)
         │   └─► CouchDB receives
         │
         └─► Pull remote changes
             └─► PouchDB receives
                 │
                 ▼
             Change events fire
                 │
                 ▼
             All MiniApps update
                 │
                 └─► UI reflects server state

Result: Seamless sync, no user intervention needed!
```

---

These diagrams illustrate the architecture, data flow, and interaction patterns of the MiniApp System.
