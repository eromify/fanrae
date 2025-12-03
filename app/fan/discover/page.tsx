'use client'

import { useState, useEffect, useCallback } from 'react'
import { useDebounce } from '@/hooks/useDebounce'

interface Creator {
  id: string
  username: string
  display_name: string | null
  profile_image_url: string | null
  bio: string | null
  is_active: boolean
}

export default function DiscoverPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [creators, setCreators] = useState<Creator[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  // Debounce search query to avoid too many API calls
  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  const searchCreators = useCallback(async (query: string) => {
    if (!query.trim()) {
      setCreators([])
      setHasSearched(false)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setHasSearched(true)

    try {
      const response = await fetch(`/api/discover/search?q=${encodeURIComponent(query)}`)
      
      if (!response.ok) {
        throw new Error('Failed to search creators')
      }

      const data = await response.json()
      setCreators(data.creators || [])
    } catch (error) {
      console.error('Error searching creators:', error)
      setCreators([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    searchCreators(debouncedSearchQuery)
  }, [debouncedSearchQuery, searchCreators])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  return (
    <div className="app-page">
      <div className="discover-content">
        {/* Search Bar */}
        <div className="discover-search-container">
          <div className="discover-search-wrapper">
            <svg
              className="discover-search-icon"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <input
              type="text"
              className="discover-search-input"
              placeholder="Search creators..."
              value={searchQuery}
              onChange={handleSearchChange}
            />
            {isLoading && (
              <div className="discover-search-loading">
                <div className="discover-spinner"></div>
              </div>
            )}
          </div>
        </div>

        {/* Search Results */}
        {hasSearched && (
          <div className="discover-results">
            {isLoading ? (
              <div className="discover-loading">Searching...</div>
            ) : creators.length > 0 ? (
              <div className="discover-creators-list">
                {creators.map((creator) => (
                  <div key={creator.id} className="discover-creator-item">
                    {creator.profile_image_url ? (
                      <img
                        src={creator.profile_image_url}
                        alt={creator.display_name || creator.username}
                        className="discover-creator-avatar"
                      />
                    ) : (
                      <div className="discover-creator-avatar-placeholder">
                        {creator.display_name?.[0] || creator.username[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    <div className="discover-creator-info">
                      <div className="discover-creator-name">
                        {creator.display_name || creator.username}
                      </div>
                      <div className="discover-creator-username">
                        @{creator.username}
                      </div>
                      {creator.bio && (
                        <div className="discover-creator-bio">
                          {creator.bio}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="discover-empty">
                No creators found matching "{searchQuery}"
              </div>
            )}
          </div>
        )}

        {/* Initial State - No search yet */}
        {!hasSearched && (
          <div className="discover-initial">
            <p className="discover-initial-text">Search for creators by username or name</p>
          </div>
        )}
      </div>
    </div>
  )
}
