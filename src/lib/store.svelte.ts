import { noteService, type Note, type NoteMetadata } from './db'

// Global state using Svelte 5 runes (optimized for performance)
class NotesStore {
  notes: NoteMetadata[] = $state([]) // Use metadata for list (lightweight)
  currentNote: Note | null = $state(null)
  isLoading: boolean = $state(false)
  searchQuery: string = $state('')
  totalNotes: number = $state(0)
  
  // Pagination state
  private pageSize = 50 // Load 50 notes at a time
  private currentPage = 0
  private hasMore = true
  
  // Cache for search results
  private searchCache = new Map<string, NoteMetadata[]>()
  private cacheTimeout = 5 * 60 * 1000 // 5 minutes

  // Load notes with incremental loading (initial batch)
  async loadNotes(reset: boolean = false) {
    if (reset) {
      this.currentPage = 0
      this.hasMore = true
      this.notes = []
    }
    
    if (!this.hasMore && !reset) return
    
    this.isLoading = true
    try {
      const offset = this.currentPage * this.pageSize
      const metadata = await noteService.getNotesMetadata(this.pageSize, offset)
      
      // Sort: pinned first, then by updatedAt
      const sorted = metadata.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1
        if (!a.pinned && b.pinned) return 1
        return b.updatedAt - a.updatedAt
      })
      
      if (reset) {
        this.notes = sorted
      } else {
        this.notes = [...this.notes, ...sorted]
      }
      
      this.hasMore = metadata.length === this.pageSize
      this.currentPage++
      
      // Update total count
      this.totalNotes = await noteService.getNotesCount()
    } catch (error) {
      console.error('Failed to load notes:', error)
    } finally {
      this.isLoading = false
    }
  }
  
  // Load more notes (infinite scroll)
  async loadMoreNotes() {
    if (!this.isLoading && this.hasMore && !this.searchQuery) {
      await this.loadNotes(false)
    }
  }

  // Load specific note
  async loadNote(id: number) {
    try {
      const note = await noteService.getNote(id)
      this.currentNote = note || null
    } catch (error) {
      console.error('Failed to load note:', error)
    }
  }

  // Create new note
  async createNote(title: string, content: string = '') {
    try {
      const id = await noteService.createNote(title, content)
      await this.loadNotes(true) // Refresh list from start
      return id
    } catch (error) {
      console.error('Failed to create note:', error)
      throw error
    }
  }

  // Update note with debouncing (optimized - no full refresh)
  private updateTimeout: number | null = null
  
  async updateNote(id: number, updates: Partial<Note>) {
    // Debounce: update local state immediately (instant UI response)
    if (this.currentNote && this.currentNote.id === id) {
      Object.assign(this.currentNote, updates)
    }
    
    // Update metadata in list immediately (if exists)
    const noteIndex = this.notes.findIndex(n => n.id === id)
    if (noteIndex !== -1 && updates.title) {
      this.notes[noteIndex].title = updates.title
    }
    if (noteIndex !== -1 && updates.content) {
      this.notes[noteIndex].preview = updates.content.substring(0, 150).trim()
      this.notes[noteIndex].wordCount = updates.content.split(/\s+/).filter(w => w.length > 0).length
      this.notes[noteIndex].updatedAt = Date.now()
    }
    
    // Clear previous timeout
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout)
    }

    // Debounce save to IndexedDB (500ms) - only persist, no refresh
    this.updateTimeout = setTimeout(async () => {
      try {
        await noteService.updateNote(id, updates)
        // No full refresh needed - local state already updated!
      } catch (error) {
        console.error('Failed to update note:', error)
      }
    }, 500) as unknown as number
  }

  // Delete note (optimized - remove from list locally)
  async deleteNote(id: number) {
    try {
      // Remove from local state immediately
      this.notes = this.notes.filter(n => n.id !== id)
      
      if (this.currentNote?.id === id) {
        this.currentNote = null
      }
      
      // Persist deletion
      await noteService.deleteNote(id)
      this.totalNotes--
    } catch (error) {
      console.error('Failed to delete note:', error)
      // Revert on error
      await this.loadNotes(true)
    }
  }

  // Search notes (optimized with caching)
  private searchTimeout: number | null = null
  
  async search(query: string) {
    this.searchQuery = query
    
    // Clear previous timeout for debouncing
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout)
    }
    
    if (query.trim() === '') {
      await this.loadNotes(true)
      return
    }
    
    // Debounce search (300ms)
    this.searchTimeout = setTimeout(async () => {
      try {
        // Check cache first
        const cached = this.searchCache.get(query)
        if (cached) {
          this.notes = cached
          return
        }
        
        // Perform search
        const results = await noteService.searchNotes(query, 100)
        
        // Cache results
        this.searchCache.set(query, results)
        setTimeout(() => this.searchCache.delete(query), this.cacheTimeout)
        
        this.notes = results
      } catch (error) {
        console.error('Failed to search notes:', error)
      }
    }, 300) as unknown as number
  }

  // Clear current note
  clearCurrentNote() {
    this.currentNote = null
  }

  // Toggle pin
  async togglePin(id: number) {
    try {
      await noteService.togglePin(id)
      await this.loadNotes()
      // Update current note if it's the one being pinned
      if (this.currentNote?.id === id) {
        this.currentNote.pinned = !this.currentNote.pinned
      }
    } catch (error) {
      console.error('Failed to toggle pin:', error)
    }
  }

  // Export notes
  async exportNotes() {
    try {
      const jsonString = await noteService.exportNotes()
      const blob = new Blob([jsonString], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mindnote-backup-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to export notes:', error)
    }
  }

  // Import notes
  async importNotes(file: File) {
    try {
      const text = await file.text()
      const imported = await noteService.importNotes(text)
      await this.loadNotes()
      return imported
    } catch (error) {
      console.error('Failed to import notes:', error)
      throw error
    }
  }
}

// UI State Store for sidebar toggle, theme, etc
class UIStore {
  sidebarOpen: boolean = $state(true)
  isMobile: boolean = $state(false)
  theme: 'dark' | 'light' | 'typewriter' | 'minimal' | 'dark-typewriter' | 'green-terminal' | 'amber-noir' | 'indigo-typewriter' | 'everforest-transparent' | 'tokyo-night-transparent' | 'gruvbox-transparent' = $state('dark')
  font: string = $state('courier-prime')
  fontSize: number = $state(16)
  previewMode: 'edit' | 'split' | 'preview' = $state('edit')

  // Cycle through preview modes intelligently
  cyclePreviewMode() {
    if (this.isMobile) {
      // On mobile, just toggle between edit and full preview
      this.previewMode = this.previewMode === 'edit' ? 'preview' : 'edit';
    } else {
      // On desktop, cycle through edit -> split -> preview -> edit
      const modes: Array<'edit' | 'split' | 'preview'> = ['edit', 'split', 'preview'];
      const currentIndex = modes.indexOf(this.previewMode);
      const nextIndex = (currentIndex + 1) % modes.length;
      this.previewMode = modes[nextIndex];
    }
  }

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen
    // Save sidebar state to localStorage
    localStorage.setItem('mindnote-sidebar', this.sidebarOpen.toString())
  }

  closeSidebar() {
    this.sidebarOpen = false
    localStorage.setItem('mindnote-sidebar', 'false')
  }

  openSidebar() {
    this.sidebarOpen = true
    localStorage.setItem('mindnote-sidebar', 'true')
  }

  setMobile(mobile: boolean) {
    this.isMobile = mobile
    // Auto-close sidebar on mobile by default
    if (mobile) {
      this.sidebarOpen = false
    } else {
      // Load saved sidebar state for desktop
      const savedSidebar = localStorage.getItem('mindnote-sidebar')
      if (savedSidebar !== null) {
        this.sidebarOpen = savedSidebar === 'true'
      }
    }
  }

  // Set theme
  setTheme(theme: 'dark' | 'light' | 'typewriter' | 'minimal' | 'dark-typewriter' | 'green-terminal' | 'amber-noir' | 'indigo-typewriter' | 'everforest-transparent' | 'tokyo-night-transparent' | 'gruvbox-transparent') {
    this.theme = theme
    // Save to localStorage
    localStorage.setItem('mindnote-theme', this.theme)
    // Apply theme to document
    this.applyTheme()
  }

  // Toggle theme (cycle through all themes)
  toggleTheme() {
    const themes: Array<'dark' | 'light' | 'typewriter' | 'minimal' | 'dark-typewriter' | 'green-terminal' | 'amber-noir' | 'indigo-typewriter' | 'everforest-transparent' | 'tokyo-night-transparent' | 'gruvbox-transparent'> = ['dark', 'light', 'typewriter', 'minimal', 'dark-typewriter', 'green-terminal', 'amber-noir', 'indigo-typewriter', 'everforest-transparent', 'tokyo-night-transparent', 'gruvbox-transparent']
    const currentIndex = themes.indexOf(this.theme)
    const nextIndex = (currentIndex + 1) % themes.length
    this.setTheme(themes[nextIndex])
  }

  // Apply theme
  applyTheme() {
    document.documentElement.setAttribute('data-theme', this.theme)
  }

  // Load theme from localStorage
  loadTheme() {
    const savedTheme = localStorage.getItem('mindnote-theme') as 'dark' | 'light' | 'typewriter' | 'minimal' | null
    if (savedTheme) {
      this.theme = savedTheme
    }
    this.applyTheme()
  }

  // Set font
  setFont(font: string) {
    this.font = font
    // Save to localStorage
    localStorage.setItem('mindnote-font', font)
    // Apply font to document
    this.applyFont()
  }

  // Apply font
  applyFont() {
    document.documentElement.setAttribute('data-font', this.font)
  }

  // Load font from localStorage
  loadFont() {
    const savedFont = localStorage.getItem('mindnote-font')
    if (savedFont) {
      this.font = savedFont
    }
    this.applyFont()
  }

  // Set font size
  setFontSize(size: number) {
    this.fontSize = Math.max(12, Math.min(100, size)) // Limit between 12-100px
    // Save to localStorage
    localStorage.setItem('mindnote-fontSize', this.fontSize.toString())
    // Apply font size to document
    this.applyFontSize()
  }

  // Apply font size
  applyFontSize() {
    document.documentElement.style.setProperty('--editor-font-size', `${this.fontSize}px`)
  }

  // Load font size from localStorage
  loadFontSize() {
    const savedSize = localStorage.getItem('mindnote-fontSize')
    if (savedSize) {
      this.fontSize = parseInt(savedSize, 10)
    }
    this.applyFontSize()
  }
}

export const notesStore = new NotesStore()
export const uiStore = new UIStore()
