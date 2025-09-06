"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Edit, RefreshCw, Palette, X } from "lucide-react"

interface SelectedImage {
  element: HTMLImageElement
  rect: DOMRect
}

interface DinoOverlayProps {
  isDetailView?: boolean
}

export function DinoOverlay({ isDetailView = false }: DinoOverlayProps) {
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null)
  const [showSidebar, setShowSidebar] = useState(false)
  const [showChatBar, setShowChatBar] = useState(false)

  useEffect(() => {
    const updateImagePosition = () => {
      if (selectedImage) {
        const newRect = selectedImage.element.getBoundingClientRect()
        setSelectedImage({ element: selectedImage.element, rect: newRect })
      }
    }

    if (selectedImage) {
      window.addEventListener("scroll", updateImagePosition)
      window.addEventListener("resize", updateImagePosition)

      return () => {
        window.removeEventListener("scroll", updateImagePosition)
        window.removeEventListener("resize", updateImagePosition)
      }
    }
  }, [selectedImage])

  useEffect(() => {
    const handleImageClick = (e: Event) => {
      const target = e.target as HTMLImageElement
      if (target.classList.contains("editable-room") && isDetailView) {
        e.preventDefault()
        const rect = target.getBoundingClientRect()
        setSelectedImage({ element: target, rect })
        setShowSidebar(true)
        setTimeout(() => {
          setShowChatBar(true)
        }, 300)

        const modalContent = document.querySelector("[data-modal-content]")
        if (modalContent) {
          modalContent.classList.add("blur-modal-content")
        }
        target.classList.add("selected-image")
      }
    }

    const images = document.querySelectorAll(".editable-room")
    images.forEach((img) => {
      img.addEventListener("click", handleImageClick)
      if (isDetailView) {
        img.style.cursor = "pointer"
      }
    })

    return () => {
      images.forEach((img) => {
        img.removeEventListener("click", handleImageClick)
      })
    }
  }, [isDetailView])

  const clearSelection = () => {
    setShowChatBar(false)
    setTimeout(() => {
      setSelectedImage(null)
      setShowSidebar(false)

      const modalContent = document.querySelector("[data-modal-content]")
      if (modalContent) {
        modalContent.classList.remove("blur-modal-content")
      }
      const selectedImg = document.querySelector(".selected-image")
      if (selectedImg) {
        selectedImg.classList.remove("selected-image")
      }
    }, 200)
  }

  const quickActions = [
    { label: "Scandi Style", icon: Palette },
    { label: "Minimalist", icon: Edit },
    { label: "Add Sofa", icon: RefreshCw },
    { label: "Modern", icon: Palette },
    { label: "Cozy", icon: Edit },
    { label: "Luxury", icon: RefreshCw },
  ]

  if (!isDetailView) {
    return null
  }

  return (
    <>
      {selectedImage && (
        <div className="fixed inset-0 z-[9998] pointer-events-none">
          <div className="w-full h-full backdrop-blur-sm bg-black/10" />
        </div>
      )}

      {selectedImage && (
        <div
          className="fixed pointer-events-none z-[9999]"
          style={{
            top: selectedImage.rect.top - 8,
            left: selectedImage.rect.left - 8,
            width: selectedImage.rect.width + 16,
            height: selectedImage.rect.height + 16,
          }}
        >
          <div className="w-full h-full rounded-2xl border-2 border-white/80 shadow-[0_0_30px_rgba(255,255,255,0.8),0_0_60px_rgba(255,255,255,0.4)] transition-all duration-300" />
          <Button
            size="sm"
            variant="ghost"
            onClick={clearSelection}
            className="absolute -top-2 -right-2 w-6 h-6 p-0 bg-white/90 hover:bg-white text-black rounded-full shadow-lg pointer-events-auto z-[10000]"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      )}

      {selectedImage && (
        <div
          className="fixed z-[9999] dino-overlay-element transition-all duration-500 ease-out"
          style={{
            top: selectedImage.rect.top - 24 - 40,
            left: selectedImage.rect.left + selectedImage.rect.width / 2 - 120,
          }}
        >
          <div className="flex items-center gap-2 px-4 py-2 bg-white/30 backdrop-blur-md border border-white/40 rounded-2xl shadow-xl transform transition-all duration-500 ease-out animate-in slide-in-from-top-4">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-3 text-black hover:bg-white/30 transition-all duration-300"
            >
              <Edit className="w-4 h-4 mr-1" />
              Edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-3 text-black hover:bg-white/30 transition-all duration-300"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Replace
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-3 text-black hover:bg-white/30 transition-all duration-300"
            >
              <Palette className="w-4 h-4 mr-1" />
              Style
            </Button>
          </div>
        </div>
      )}

      {selectedImage && (
        <div
          className={`fixed z-[9999] transition-all duration-500 ease-out dino-overlay-element ${showSidebar ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
            }`}
          style={{
            top: selectedImage.rect.top + selectedImage.rect.height / 2,
            left: selectedImage.rect.right + 24,
            width: "320px",
            transform: "translateY(-50%)",
          }}
        >
          <div className="h-auto max-h-[80vh] bg-white/10 backdrop-blur-xl border border-white/30 rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-black">Quick Actions</h3>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={clearSelection}
                  className="text-black hover:bg-white/20 transition-all duration-300"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-3">
                {quickActions.map((action, index) => {
                  const Icon = action.icon
                  return (
                    <Button
                      key={action.label}
                      variant="ghost"
                      className="w-full justify-start text-black hover:bg-white/20 transition-all duration-300 transform hover:scale-105"
                      style={{
                        animationDelay: `${index * 50}ms`,
                      }}
                    >
                      <Icon className="w-5 h-5 mr-3" />
                      {action.label}
                    </Button>
                  )
                })}
              </div>

              <div className="mt-8 p-4 bg-white/10 rounded-2xl border border-white/20">
                <h4 className="text-sm font-medium text-black mb-2">AI Suggestions</h4>
                <p className="text-xs text-black/70 leading-relaxed">
                  Based on this room, we recommend adding warm lighting and modern furniture to enhance the space.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        className={`fixed z-[9999] dino-overlay-element transition-all duration-700 ease-out ${showChatBar ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
          }`}
        style={{
          top: selectedImage ? selectedImage.rect.bottom + 24 : "calc(100% - 72px - 24px)",
          left: selectedImage ? selectedImage.rect.left + selectedImage.rect.width / 2 - 192 : "50%",
          transform: selectedImage ? "none" : "translateX(-50%)",
        }}
      >
        <div className="w-96 h-12 bg-white/10 backdrop-blur-xl border border-white/30 rounded-full shadow-2xl">
          <div className="flex items-center gap-3 px-6 h-full">
            <div className="w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-pulse" />
            <Input
              placeholder="Ask AI about room design..."
              className="flex-1 bg-transparent border-none text-black placeholder:text-black/60 focus:outline-none focus:ring-0 text-sm"
            />
            <Button
              size="sm"
              variant="ghost"
              className="w-8 h-8 p-0 text-black hover:bg-white/20 transition-all duration-300"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .editable-room {
          transition: all 0.3s ease;
          position: relative;
        }
        
        .dino-overlay-element {
          z-index: 9999;
        }
        
        .selected-image {
          z-index: 9997 !important;
          position: relative !important;
          filter: none !important;
          transform: scale(1.02) translateZ(0);
          box-shadow: 0 10px 30px rgba(255, 255, 255, 0.6), 0 0 50px rgba(255, 255, 255, 0.3);
          border-radius: 16px;
        }
        
        .blur-modal-content > *:not(.selected-image):not([data-overlay-element]) {
          filter: blur(4px);
          opacity: 0.6;
          transition: all 0.3s ease;
        }
        
        .blur-modal-content .selected-image {
          filter: none !important;
          opacity: 1 !important;
        }
      `}</style>
    </>
  )
}
