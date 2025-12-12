import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { invoke } from '@tauri-apps/api/core'
import { convertFileSrc } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'
import './App.css'

interface ImageData {
  id: string
  path: string
  displayPath: string
  name: string
  tags: string[]
  description: string
}

function App() {
  const [images, setImages] = useState<ImageData[]>([])
  const [selectedImage, setSelectedImage] = useState<ImageData | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set())
  const [scanVersion, setScanVersion] = useState(0)
  const [showOverlay, setShowOverlay] = useState(false)
  const [isGeneratingTags, setIsGeneratingTags] = useState(false)

  const filteredImages = images.filter(img =>
    img.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    img.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  // Get current image index for navigation
  const currentIndex = selectedImage
    ? filteredImages.findIndex(img => img.id === selectedImage.id)
    : -1

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setSelectedImage(filteredImages[currentIndex - 1])
    }
  }, [currentIndex, filteredImages])

  const goToNext = useCallback(() => {
    if (currentIndex < filteredImages.length - 1) {
      setSelectedImage(filteredImages[currentIndex + 1])
    }
  }, [currentIndex, filteredImages])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedImage) return

      if (e.key === 'ArrowLeft') {
        goToPrevious()
      } else if (e.key === 'ArrowRight') {
        goToNext()
      } else if (e.key === 'Escape') {
        setSelectedImage(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedImage, goToPrevious, goToNext])

  // Show overlay briefly when image changes, then hide
  useEffect(() => {
    if (selectedImage) {
      setShowOverlay(true)
      const timer = setTimeout(() => setShowOverlay(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [selectedImage])

  // Hide overlay after mouse stops moving
  useEffect(() => {
    if (!showOverlay || !selectedImage) return
    const timer = setTimeout(() => setShowOverlay(false), 2000)
    return () => clearTimeout(timer)
  }, [showOverlay, selectedImage])

  const handleScanFolder = async () => {
    try {
      // Open folder picker
      const selectedFolder = await open({
        directory: true,
        multiple: false,
        title: 'Select a folder with images',
      })

      if (!selectedFolder) {
        return // User cancelled
      }

      setIsScanning(true)
      setLoadedImages(new Set())
      setScanVersion(v => v + 1)

      // Call Rust backend to scan folder
      const result = await invoke<Omit<ImageData, 'displayPath'>[]>('scan_folder', {
        folderPath: selectedFolder,
      })

      // Convert local paths to displayable URLs
      const imagesWithDisplayPaths: ImageData[] = result.map(img => ({
        ...img,
        displayPath: convertFileSrc(img.path),
      }))

      setImages(imagesWithDisplayPaths)
    } catch (error) {
      console.error('Failed to scan folder:', error)
    } finally {
      setIsScanning(false)
    }
  }

  const handleImageLoad = (id: string) => {
    setLoadedImages(prev => new Set(prev).add(id))
  }

  const handleGenerateTags = async () => {
    if (!selectedImage || isGeneratingTags) return

    setIsGeneratingTags(true)
    try {
      const tags = await invoke<string[]>('generate_tags', {
        imagePath: selectedImage.path,
      })

      // Update the image in the images array
      setImages(prev => prev.map(img =>
        img.id === selectedImage.id ? { ...img, tags } : img
      ))

      // Update the selected image
      setSelectedImage(prev => prev ? { ...prev, tags } : null)
    } catch (error) {
      console.error('Failed to generate tags:', error)
    } finally {
      setIsGeneratingTags(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Animated background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-rose-950/20 via-zinc-950 to-orange-950/15 pointer-events-none -z-10" />

      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-2xl bg-zinc-950/70 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-16 py-4">
          <div className="flex items-center justify-between gap-6">
            {/* Logo */}
            <motion.div
              className="flex items-center gap-3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center shadow-lg shadow-black/20 border border-rose-900/20">
                <svg className="w-5 h-5 text-rose-200/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h1 className="text-xl font-semibold text-white tracking-tight">Gallery</h1>
            </motion.div>

            {/* Search */}
            <motion.div
              className="flex-1 max-w-xs"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className="relative group">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-zinc-300 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-16 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-zinc-500 focus:outline-none focus:bg-white/10 focus:border-zinc-600 focus:ring-2 focus:ring-zinc-700/30 transition-all duration-300"
                />
              </div>
            </motion.div>

            {/* Scan Button */}
            <motion.button
              onClick={handleScanFolder}
              disabled={isScanning}
              className="min-w-[180px] px-8 py-2.5 bg-gradient-to-r from-zinc-700 to-zinc-800 text-zinc-100 font-medium rounded-xl flex items-center justify-center gap-3 disabled:opacity-50 shadow-lg shadow-black/30 border border-rose-900/20 whitespace-nowrap"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              whileHover={{ scale: 1.02, boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.5)', borderColor: 'rgba(136, 19, 55, 0.4)' }}
              whileTap={{ scale: 0.98 }}
            >
              {isScanning ? (
                <motion.svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </motion.svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              )}
              {isScanning ? 'Scanning...' : 'Scan Folder'}
            </motion.button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10">
        <AnimatePresence mode="wait">
          {images.length === 0 ? (
            /* Empty State */
            <motion.div
              key="empty"
              className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              <motion.div
                className="w-32 h-32 rounded-3xl bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 flex items-center justify-center mb-8 border border-white/5"
                animate={{
                  boxShadow: ['0 0 0 0 rgba(63, 63, 70, 0)', '0 0 0 20px rgba(63, 63, 70, 0.15)', '0 0 0 0 rgba(63, 63, 70, 0)']
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <svg className="w-16 h-16 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </motion.div>
              <h2 className="text-3xl font-bold text-white mb-3">Your gallery awaits</h2>
              <p className="text-zinc-400 mb-10 max-w-md text-lg">
                Scan a folder to import your images. We'll help you organize and tag them with AI.
              </p>
              <motion.button
                onClick={handleScanFolder}
                className="px-8 py-4 bg-gradient-to-r from-zinc-700 to-zinc-800 text-zinc-100 font-semibold rounded-2xl shadow-2xl shadow-black/40 border border-rose-900/20 relative isolate"
                whileHover={{ scale: 1.05, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)', borderColor: 'rgba(136, 19, 55, 0.4)' }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="relative z-10">Get Started</span>
              </motion.button>
            </motion.div>
          ) : (
            /* Image Grid - Seamless, no gaps, no rounding */
            <motion.div
              key="grid"
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {filteredImages.map((image, index) => (
                <motion.div
                  key={image.id}
                  onClick={() => setSelectedImage(image)}
                  className="relative aspect-square overflow-hidden cursor-pointer"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{
                    duration: 0.3,
                    delay: index * 0.03,
                  }}
                >
                  {/* Skeleton loader */}
                  {!loadedImages.has(image.id) && (
                    <div className="absolute inset-0 bg-zinc-950 animate-pulse" />
                  )}

                  <motion.img
                    key={`${image.id}-${scanVersion}`}
                    src={image.displayPath}
                    alt={image.name}
                    className="w-full h-full object-cover"
                    onLoad={() => handleImageLoad(image.id)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: loadedImages.has(image.id) ? 1 : 0 }}
                    transition={{ duration: 0.3 }}
                    whileHover={{ scale: 1.05 }}
                  />

                  {/* Subtle hover overlay */}
                  <motion.div
                    className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors duration-200"
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Image Modal - Fullscreen with bottom overlay */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center cursor-pointer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setShowOverlay(prev => !prev)}
          >
            {/* Fullscreen backdrop */}
            <div className="absolute inset-0 bg-black" />

            {/* Main image - fills screen with padding */}
            <motion.img
              src={selectedImage.displayPath}
              alt={selectedImage.name}
              className="relative z-10 max-h-[90vh] max-w-[90vw] object-contain"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              onDoubleClick={() => setSelectedImage(null)}
            />

            {/* Navigation arrows */}
            {currentIndex > 0 && (
              <motion.button
                className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
                onClick={(e) => { e.stopPropagation(); goToPrevious(); }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: showOverlay ? 1 : 0, x: 0 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </motion.button>
            )}

            {currentIndex < filteredImages.length - 1 && (
              <motion.button
                className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
                onClick={(e) => { e.stopPropagation(); goToNext(); }}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: showOverlay ? 1 : 0, x: 0 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </motion.button>
            )}

            {/* Close button - top left */}
            <motion.button
              className="absolute top-6 left-6 z-20 p-3 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
              onClick={(e) => { e.stopPropagation(); setSelectedImage(null); }}
              initial={{ opacity: 0 }}
              animate={{ opacity: showOverlay ? 1 : 0 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </motion.button>

            {/* Image counter - top right */}
            <motion.div
              className="absolute top-6 right-6 z-20 px-4 py-2 bg-black/50 rounded-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: showOverlay ? 1 : 0 }}
            >
              <span className="text-white text-sm font-medium">
                {currentIndex + 1} / {filteredImages.length}
              </span>
            </motion.div>

            {/* Bottom overlay - fades in/out */}
            <motion.div
              className="absolute bottom-0 left-0 right-0 z-20"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: showOverlay ? 1 : 0, y: showOverlay ? 0 : 20 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-t from-black/80 via-black/50 to-transparent pt-16 pb-6 px-6">
                <div className="max-w-4xl mx-auto">
                  {/* Filename */}
                  <h2 className="text-white text-xl font-medium mb-3">{selectedImage.name}</h2>

                  {/* Tags */}
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    {selectedImage.tags.length > 0 ? (
                      selectedImage.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-white/70 text-sm"
                        >
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-white/50 text-sm">No tags</span>
                    )}
                  </div>

                  {/* Action button */}
                  <button
                    onClick={handleGenerateTags}
                    disabled={isGeneratingTags}
                    className="text-white/70 hover:text-white text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    {isGeneratingTags ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    )}
                    {isGeneratingTags ? 'Generating...' : 'Generate AI Tags'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default App
