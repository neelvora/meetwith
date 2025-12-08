'use client'

import { useState, useEffect } from 'react'
import { Link as LinkIcon, Plus, Clock, Video, ExternalLink, X, Check, Loader2, Trash2, GripVertical, ChevronUp, ChevronDown, Sparkles } from 'lucide-react'
import { Button, Card, CardContent, Input } from '@/components/ui'

interface EventType {
  id: string
  name: string
  slug: string
  duration: number
  color: string
  description: string
  is_active: boolean
  sort_index?: number
}

const COLOR_OPTIONS = [
  { name: 'violet', value: '#8b5cf6', gradient: 'from-violet-500 to-purple-600' },
  { name: 'emerald', value: '#10b981', gradient: 'from-emerald-500 to-teal-600' },
  { name: 'blue', value: '#3b82f6', gradient: 'from-blue-500 to-cyan-600' },
  { name: 'orange', value: '#f97316', gradient: 'from-orange-500 to-amber-600' },
  { name: 'pink', value: '#ec4899', gradient: 'from-pink-500 to-rose-600' },
]

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120]

interface Props {
  username: string
}

export default function EventTypesClient({ username }: Props) {
  const [eventTypes, setEventTypes] = useState<EventType[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState<EventType | null>(null)
  const [saving, setSaving] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [generatingDescription, setGeneratingDescription] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    duration: 30,
    color: 'violet',
    description: '',
    is_active: true,
  })

  useEffect(() => {
    fetchEventTypes()
  }, [])

  async function fetchEventTypes() {
    try {
      const res = await fetch('/api/event-types')
      const data = await res.json()
      setEventTypes(data.eventTypes || [])
    } catch (error) {
      console.error('Error fetching event types:', error)
    } finally {
      setLoading(false)
    }
  }

  function openCreateModal() {
    setEditingEvent(null)
    setFormData({
      name: '',
      slug: '',
      duration: 30,
      color: 'violet',
      description: '',
      is_active: true,
    })
    setShowModal(true)
  }

  function openEditModal(event: EventType) {
    setEditingEvent(event)
    setFormData({
      name: event.name,
      slug: event.slug,
      duration: event.duration,
      color: event.color,
      description: event.description,
      is_active: event.is_active,
    })
    setShowModal(true)
  }

  function generateSlug(name: string) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setNotification(null)

    try {
      const url = editingEvent 
        ? `/api/event-types/${editingEvent.id}`
        : '/api/event-types'
      
      const res = await fetch(url, {
        method: editingEvent ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save')
      }

      await fetchEventTypes()
      setShowModal(false)
      setNotification({ 
        type: 'success', 
        message: editingEvent ? 'Event type updated!' : 'Event type created!' 
      })
      setTimeout(() => setNotification(null), 3000)
    } catch (error) {
      setNotification({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Failed to save event type' 
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this event type?')) return

    try {
      const res = await fetch(`/api/event-types/${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        throw new Error('Failed to delete')
      }

      await fetchEventTypes()
      setNotification({ type: 'success', message: 'Event type deleted!' })
      setTimeout(() => setNotification(null), 3000)
    } catch (error) {
      setNotification({ type: 'error', message: 'Failed to delete event type' })
    }
  }

  async function toggleActive(event: EventType) {
    try {
      const res = await fetch(`/api/event-types/${event.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...event, is_active: !event.is_active }),
      })

      if (!res.ok) {
        throw new Error('Failed to update')
      }

      await fetchEventTypes()
    } catch (error) {
      setNotification({ type: 'error', message: 'Failed to update event type' })
    }
  }

  function copyLink(slug: string, id: string) {
    const link = `https://www.meetwith.dev/${username}/${slug}`
    navigator.clipboard.writeText(link)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  async function generateAIDescription() {
    if (!formData.name) {
      setNotification({ type: 'error', message: 'Please enter an event name first' })
      setTimeout(() => setNotification(null), 3000)
      return
    }

    setGeneratingDescription(true)
    try {
      const res = await fetch('/api/ai/event-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.name,
          durationMinutes: formData.duration,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to generate description')
      }

      const data = await res.json()
      setFormData(prev => ({ ...prev, description: data.description }))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate description'
      setNotification({ type: 'error', message })
      setTimeout(() => setNotification(null), 3000)
    } finally {
      setGeneratingDescription(false)
    }
  }

  async function moveEventType(id: string, direction: 'up' | 'down') {
    const currentIndex = eventTypes.findIndex(e => e.id === id)
    if (currentIndex === -1) return
    if (direction === 'up' && currentIndex === 0) return
    if (direction === 'down' && currentIndex === eventTypes.length - 1) return

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    const newOrder = [...eventTypes]
    const [moved] = newOrder.splice(currentIndex, 1)
    newOrder.splice(newIndex, 0, moved)

    // Optimistically update UI
    setEventTypes(newOrder)

    // Update order on server
    try {
      const res = await fetch('/api/event-types', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          order: newOrder.map((e, i) => ({ id: e.id, sort_index: i }))
        }),
      })

      if (!res.ok) {
        // Revert on error
        await fetchEventTypes()
        setNotification({ type: 'error', message: 'Failed to update order' })
      }
    } catch {
      await fetchEventTypes()
      setNotification({ type: 'error', message: 'Failed to update order' })
    }
  }

  const getColorGradient = (colorName: string) => {
    return COLOR_OPTIONS.find(c => c.name === colorName)?.gradient || COLOR_OPTIONS[0].gradient
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">Event Types</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
            Create different meeting types for people to book with you.
          </p>
        </div>
        <Button onClick={openCreateModal} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          New Event Type
        </Button>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`mb-6 p-4 rounded-lg ${
          notification.type === 'success' 
            ? 'bg-green-500/20 border border-green-500/30 text-green-400' 
            : 'bg-red-500/20 border border-red-500/30 text-red-400'
        }`}>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4" />
            {notification.message}
          </div>
        </div>
      )}

      {/* Event Types List */}
      <div className="space-y-4">
        {eventTypes.length === 0 ? (
          <Card variant="bordered" className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-violet-500/10 flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-violet-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">No Event Types Yet</h3>
              <p className="text-sm text-gray-500 dark:text-gray-500 max-w-xs mb-4">
                Create your first event type to start accepting bookings.
              </p>
              <Button onClick={openCreateModal}>
                <Plus className="w-4 h-4 mr-2" />
                Create Event Type
              </Button>
            </CardContent>
          </Card>
        ) : (
          eventTypes.map((eventType, index) => (
            <Card key={eventType.id} variant="glass" className="hover:border-white/20 transition-all">
              <CardContent className="flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Reorder controls - desktop */}
                <div className="hidden sm:flex flex-col items-center gap-1">
                  <button
                    onClick={() => moveEventType(eventType.id, 'up')}
                    disabled={index === 0}
                    className={`p-1 rounded transition-colors ${
                      index === 0 
                        ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed' 
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10'
                    }`}
                    title="Move up"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <GripVertical className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  <button
                    onClick={() => moveEventType(eventType.id, 'down')}
                    disabled={index === eventTypes.length - 1}
                    className={`p-1 rounded transition-colors ${
                      index === eventTypes.length - 1 
                        ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed' 
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10'
                    }`}
                    title="Move down"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>

                {/* Color indicator - hidden on mobile, shown on larger screens */}
                <div className={`hidden sm:block w-2 h-16 rounded-full bg-gradient-to-b ${getColorGradient(eventType.color)}`} />
                
                {/* Mobile header with color bar and reorder */}
                <div className="sm:hidden flex items-center gap-2">
                  <div className={`flex-1 h-1 rounded-full bg-gradient-to-r ${getColorGradient(eventType.color)}`} />
                  <button
                    onClick={() => moveEventType(eventType.id, 'up')}
                    disabled={index === 0}
                    className={`p-1.5 rounded ${index === 0 ? 'text-gray-400 dark:text-gray-600' : 'text-gray-500 dark:text-gray-400'}`}
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => moveEventType(eventType.id, 'down')}
                    disabled={index === eventTypes.length - 1}
                    className={`p-1.5 rounded ${index === eventTypes.length - 1 ? 'text-gray-400 dark:text-gray-600' : 'text-gray-500 dark:text-gray-400'}`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{eventType.name}</h3>
                    <button
                      onClick={() => toggleActive(eventType)}
                      className={`text-xs px-2 py-0.5 rounded-full cursor-pointer transition-colors ${
                        eventType.is_active 
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30' 
                          : 'bg-gray-500/20 text-gray-400 border border-gray-500/30 hover:bg-gray-500/30'
                      }`}
                    >
                      {eventType.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1">{eventType.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {eventType.duration} min
                    </span>
                    <span className="flex items-center gap-1">
                      <Video className="w-3 h-3" />
                      Google Meet
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 justify-end">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-gray-500 dark:text-gray-400"
                    onClick={() => window.open(`/${username}/${eventType.slug}`, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-gray-500 dark:text-gray-400"
                    onClick={() => openEditModal(eventType)}
                  >
                    Edit
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-red-400 hover:bg-red-500/10"
                    onClick={() => handleDelete(eventType.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>

              {/* Link preview */}
              <div className="px-4 sm:px-6 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/5">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <LinkIcon className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
                    <span className="text-sm text-gray-600 dark:text-gray-400 truncate">
                      meetwith.dev/{username}/{eventType.slug}
                    </span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-xs w-full sm:w-auto"
                    onClick={() => copyLink(eventType.slug, eventType.id)}
                  >
                    {copiedId === eventType.id ? 'Copied!' : 'Copy Link'}
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Create New Card */}
      {eventTypes.length > 0 && (
        <Card 
          variant="bordered" 
          className="mt-6 border-dashed hover:border-violet-500/50 transition-all cursor-pointer"
          onClick={openCreateModal}
        >
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-violet-500/10 flex items-center justify-center mb-4">
              <Plus className="w-6 h-6 text-violet-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Create New Event Type</h3>
            <p className="text-sm text-gray-500 dark:text-gray-500 max-w-xs">
              Set up a new booking link with custom duration, description, and settings.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-white/10">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {editingEvent ? 'Edit Event Type' : 'Create Event Type'}
              </h2>
              <button 
                onClick={() => setShowModal(false)}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <Input
                label="Event Name"
                value={formData.name}
                onChange={(e) => {
                  const name = e.target.value
                  setFormData(prev => ({
                    ...prev,
                    name,
                    slug: prev.slug || generateSlug(name),
                  }))
                }}
                placeholder="e.g., 30 Minute Meeting"
                required
              />

              <Input
                label="URL Slug"
                value={formData.slug}
                onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                placeholder="e.g., 30min"
                required
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Duration
                </label>
                <div className="flex flex-wrap gap-2">
                  {DURATION_OPTIONS.map((duration) => (
                    <button
                      key={duration}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, duration }))}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        formData.duration === duration
                          ? 'bg-violet-500 text-white'
                          : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
                      }`}
                    >
                      {duration} min
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Color
                </label>
                <div className="flex gap-3">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color.name}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, color: color.name }))}
                      className={`w-10 h-10 rounded-lg ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-900 transition-all ${
                        formData.color === color.name ? 'ring-gray-900 dark:ring-white' : 'ring-transparent'
                      } hover:ring-gray-400 dark:hover:ring-white/50`}
                      style={{ backgroundColor: color.value }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Description
                  </label>
                  <button
                    type="button"
                    onClick={generateAIDescription}
                    disabled={generatingDescription}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {generatingDescription ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    {generatingDescription ? 'Generating...' : 'Generate with AI'}
                  </button>
                </div>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this meeting is about..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Active</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">Make this event type bookable</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, is_active: !prev.is_active }))}
                  className={`w-12 h-7 rounded-full transition-all relative ${
                    formData.is_active ? 'bg-violet-500' : 'bg-gray-700'
                  }`}
                >
                  <span 
                    className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${
                      formData.is_active ? 'left-6' : 'left-1'
                    }`} 
                  />
                </button>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    editingEvent ? 'Update Event Type' : 'Create Event Type'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
