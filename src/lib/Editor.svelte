<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { notesStore, uiStore } from './store.svelte'
  import { router } from './router'
  import MarkdownPreview from './MarkdownPreview.svelte'
  import { noteService, type NoteMetadata } from './db'

  interface Props {
    id: string
  }

  let { id }: Props = $props()
  
  let titleInput: HTMLInputElement | undefined = $state()
  let contentTextarea: HTMLTextAreaElement | undefined = $state()
  let backlinks = $state<NoteMetadata[]>([])
  
  // Load note when component mounts or ID changes
  $effect(() => {
    const noteId = parseInt(id)
    if (!isNaN(noteId)) {
      notesStore.loadNote(noteId)
      // Load backlinks
      loadBacklinks(noteId)
    }
  })

  // Load backlinks from database
  const loadBacklinks = async (noteId: number) => {
    backlinks = await noteService.getBacklinks(noteId)
  }

  const handleTitleChange = (e: Event) => {
    const target = e.target as HTMLInputElement
    const noteId = parseInt(id)
    if (!isNaN(noteId)) {
      notesStore.updateNote(noteId, { title: target.value })
    }
  }

  const handleContentChange = (e: Event) => {
    const target = e.target as HTMLTextAreaElement
    const noteId = parseInt(id)
    if (!isNaN(noteId)) {
      notesStore.updateNote(noteId, { content: target.value })
    }
    // Auto-resize textarea on mobile
    autoResizeTextarea(target)
  }

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this note?')) {
      const noteId = parseInt(id)
      if (!isNaN(noteId)) {
        await notesStore.deleteNote(noteId)
        router.navigate('/')
      }
    }
  }

  const handleTogglePin = async () => {
    const noteId = parseInt(id)
    if (!isNaN(noteId)) {
      await notesStore.togglePin(noteId)
    }
  }

  const handleNewNote = async () => {
    const newId = await notesStore.createNote('New Note', '')
    router.navigate(`/note/${newId}`)
  }

  // Auto-resize textarea for mobile
  const autoResizeTextarea = (textarea: HTMLTextAreaElement) => {
    if (uiStore.isMobile) {
      textarea.style.height = 'auto'
      textarea.style.height = textarea.scrollHeight + 'px'
    }
  }

  // Focus title on mount
  onMount(() => {
    titleInput?.focus()
    // Initial textarea resize
    if (contentTextarea) {
      autoResizeTextarea(contentTextarea)
    }
  })

  // Cleanup on unmount
  onDestroy(() => {
    notesStore.clearCurrentNote()
  })
</script>

<div class="editor">
  {#if notesStore.currentNote}
    <div class="editor-header">
      <input
        bind:this={titleInput}
        type="text"
        class="title-input editor-title"
        value={notesStore.currentNote.title}
        oninput={handleTitleChange}
        placeholder="Note title..."
      />
      <div class="header-actions">
        <button 
          onclick={uiStore.toggleMarkdownPreview}
          class="btn-preview" 
          class:active={uiStore.markdownPreview}
          title={uiStore.markdownPreview ? 'Edit mode' : 'Preview mode'}
        >
          {uiStore.markdownPreview ? '✏️' : '👁️'}
        </button>
        <button 
          onclick={handleTogglePin} 
          class="btn-pin" 
          class:pinned={notesStore.currentNote.pinned}
          title={notesStore.currentNote.pinned ? 'Unpin note' : 'Pin note'}
        >
          {notesStore.currentNote.pinned ? '📍' : '📌'}
        </button>
        <button onclick={handleDelete} class="btn-delete" title="Delete note">
          🗑️
        </button>
      </div>
    </div>
    
    <div class="editor-content">
      {#if uiStore.markdownPreview}
        <MarkdownPreview content={notesStore.currentNote.content} />
      {:else}
        <textarea
          bind:this={contentTextarea}
          class="content-textarea editor-text"
          value={notesStore.currentNote.content}
          oninput={handleContentChange}
          placeholder="Start writing your note... Use [[note-title]] for cross-note links"
        ></textarea>
      {/if}
    </div>

    <div class="editor-footer">
      <div class="footer-left">
        <span class="word-count" title="Detailed statistics">
          📊 {notesStore.currentNote.content.split(/\s+/).filter(w => w.length > 0).length} words · 
          {notesStore.currentNote.content.length} characters · 
          {notesStore.currentNote.content.replace(/\s/g, '').length} chars (no spaces)
        </span>
        {#if backlinks.length > 0}
          <span class="backlinks-count" title="Notes linking to this note">
            🔗 {backlinks.length} backlink{backlinks.length > 1 ? 's' : ''}
          </span>
        {/if}
      </div>
      <span class="last-updated">
        Last updated: {new Date(notesStore.currentNote.updatedAt).toLocaleString()}
      </span>
    </div>

    <!-- Backlinks section -->
    {#if backlinks.length > 0}
      <div class="backlinks-section">
        <h3>Linked from:</h3>
        <div class="backlinks-list">
          {#each backlinks as backlink}
            <a href="#/note/{backlink.id}" class="backlink-item">
              <span class="backlink-title">{backlink.title}</span>
              <span class="backlink-preview">{backlink.preview}</span>
            </a>
          {/each}
        </div>
      </div>
    {/if}
  {:else}
    <div class="editor-empty">
      <div class="empty-icon">📝</div>
      <h2>No note selected</h2>
      <p>Select a note from the sidebar or create a new one</p>
    </div>
  {/if}

  <!-- FAB (Floating Action Button) for mobile -->
  {#if uiStore.isMobile}
    <button class="fab" onclick={handleNewNote} title="New note">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
    </button>
  {/if}
</div>

<style>
  .editor {
    flex: 1;
    height: 100vh;
    display: flex;
    flex-direction: column;
    background: var(--bg-color);
    overflow: hidden;
    position: relative;
    transition: background-color 0.3s;
  }

  .editor-header {
    padding: 1rem 1.5rem;
    padding-left: 3rem; /* Add space for toggle button */
    border-bottom: 1px solid var(--border-color);
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  /* On mobile, reset padding */
  @media (max-width: 1024px) {
    .editor-header {
      padding-left: 2rem;
    }
  }

  .header-actions {
    display: flex;
    gap: 0.5rem;
    flex-shrink: 0;
  }

  .editor-content {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .title-input {
    flex: 1;
    font-size: 1.5rem;
    font-weight: 700;
    background: transparent;
    border: none;
    color: var(--text-color);
    outline: none;
    padding: 0;
    transition: color 0.3s;
  }

  .title-input::placeholder {
    color: var(--text-secondary);
  }

  .btn-preview,
  .btn-pin,
  .btn-delete {
    background: transparent;
    border: 1px solid var(--border-color);
    font-size: 1.2rem;
    cursor: pointer;
    opacity: 0.7;
    transition: all 0.2s;
    padding: 0.5rem;
    border-radius: 4px;
  }

  .btn-preview:hover,
  .btn-preview.active {
    opacity: 1;
    border-color: var(--primary-color);
    background: var(--primary-color);
    color: white;
  }

  .btn-pin:hover {
    opacity: 1;
    border-color: var(--primary-color);
    background: var(--primary-color);
    color: white;
  }

  .btn-pin.pinned {
    opacity: 1;
    border-color: var(--primary-color);
    color: var(--primary-color);
  }

  .btn-delete:hover {
    opacity: 1;
    border-color: #ff4444;
    background: #ff4444;
    color: white;
  }

  .content-textarea {
    flex: 1;
    padding: 2rem;
    background: transparent;
    border: none;
    color: var(--text-color);
    font-size: 1rem;
    line-height: 1.6;
    resize: none;
    outline: none;
    font-family: 'Segoe UI', system-ui, sans-serif;
    transition: all 0.3s ease;
  }

  .content-textarea::placeholder {
    color: var(--text-secondary);
  }

  /* Font changing animation */
  :global(.editor-content.font-changing) {
    animation: fontFlash 0.3s ease;
  }

  @keyframes fontFlash {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }

  .editor-footer {
    padding: 0.75rem 2rem;
    border-top: 1px solid var(--border-color);
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.85rem;
    color: var(--text-secondary);
    flex-shrink: 0;
  }

  .footer-left {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  .backlinks-count {
    color: var(--primary-color);
    font-weight: 500;
    cursor: help;
  }

  /* Backlinks section */
  .backlinks-section {
    padding: 1rem 2rem;
    border-top: 1px solid var(--border-color);
    background: var(--card-bg);
    max-height: 200px;
    overflow-y: auto;
  }

  .backlinks-section h3 {
    font-size: 0.9rem;
    font-weight: 600;
    margin: 0 0 0.75rem 0;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .backlinks-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .backlink-item {
    display: flex;
    flex-direction: column;
    padding: 0.5rem 0.75rem;
    background: var(--bg-color);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    text-decoration: none;
    color: inherit;
    transition: all 0.2s;
  }

  .backlink-item:hover {
    border-color: var(--primary-color);
    background: var(--hover-bg);
  }

  .backlink-title {
    font-weight: 600;
    font-size: 0.9rem;
    color: var(--text-color);
    margin-bottom: 0.25rem;
  }

  .backlink-preview {
    font-size: 0.8rem;
    color: var(--text-secondary);
    line-height: 1.4;
  }

  .editor-empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary);
  }

  .empty-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
    opacity: 0.5;
  }

  .editor-empty h2 {
    margin: 0 0 0.5rem 0;
    font-size: 1.5rem;
    color: var(--text-color);
  }

  .editor-empty p {
    margin: 0;
    font-size: 1rem;
  }

  /* FAB (Floating Action Button) */
  .fab {
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: var(--primary-color);
    border: none;
    color: white;
    box-shadow: 0 4px 12px rgba(0, 122, 204, 0.4);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s;
    z-index: 100;
  }

  .fab:hover {
    background: var(--primary-hover);
    transform: scale(1.1);
    box-shadow: 0 6px 16px rgba(0, 122, 204, 0.6);
  }

  .fab:active {
    transform: scale(0.95);
  }

  /* Mobile optimizations */
  @media (max-width: 768px) {
    .editor-header {
      padding: 0.75rem 1rem;
      padding-top: 3.5rem; /* Space for burger menu */
    }

    .title-input {
      font-size: 1.3rem;
    }

    .content-textarea {
      padding: 1rem;
      font-size: 1rem;
      line-height: 1.8;
    }

    .editor-footer {
      padding: 0.5rem 1rem;
      font-size: 0.75rem;
      flex-direction: column;
      gap: 0.25rem;
    }

    .fab {
      bottom: 1.5rem;
      right: 1.5rem;
      width: 60px;
      height: 60px;
    }
  }

  @media (max-width: 600px) {
    .editor-header {
      padding: 0.5rem 0.75rem;
      padding-top: 3.25rem;
    }

    .title-input {
      font-size: 1.1rem;
    }

    .content-textarea {
      padding: 0.75rem;
      font-size: 0.95rem;
    }
  }
</style>
