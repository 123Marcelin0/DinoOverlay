"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { X, ChevronLeft, ChevronRight } from "lucide-react"
import { DinoOverlay } from "@/components/dino-overlay"

interface Property {
  id: number
  title: string
  description: string
  price: string
  image: string
}

interface PropertyDetailModalProps {
  property: Property | null
  properties: Property[]
  isOpen: boolean
  onClose: () => void
}

export function PropertyDetailModal({ property, properties, isOpen, onClose }: PropertyDetailModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  if (!isOpen || !property) return null

  // Find current property index
  const propertyIndex = properties.findIndex((p) => p.id === property.id)

  const goToPrevious = () => {
    const newIndex = propertyIndex > 0 ? propertyIndex - 1 : properties.length - 1
    setCurrentIndex(newIndex)
  }

  const goToNext = () => {
    const newIndex = propertyIndex < properties.length - 1 ? propertyIndex + 1 : 0
    setCurrentIndex(newIndex)
  }

  const currentProperty = properties[currentIndex] || property

  return (
    <>
      {/* Modal Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Modal Content */}
        <Card
          className="w-full max-w-6xl max-h-[95vh] overflow-hidden bg-white/95 backdrop-blur-md border border-white/20 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between p-6 border-b border-border/20">
            <h2 className="text-2xl font-bold text-foreground">{currentProperty.title}</h2>
            <Button variant="ghost" size="sm" onClick={onClose} className="hover:bg-black/10 rounded-full p-2">
              <X className="h-5 w-5" />
            </Button>
          </div>

          <CardContent className="p-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 min-h-[600px]" data-modal-content>
              {/* Image Section */}
              <div className="relative bg-gray-100 flex-shrink-0">
                <div className="aspect-[4/3] lg:aspect-square lg:h-[600px] overflow-hidden">
                  <img
                    src={currentProperty.image || "/placeholder.svg"}
                    alt={currentProperty.title}
                    className="editable-room w-full h-full object-cover object-center"
                  />
                </div>

                {/* Navigation Arrows */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goToPrevious}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-md hover:bg-white/30 rounded-full p-3 border border-white/20"
                >
                  <ChevronLeft className="h-5 w-5 text-white" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goToNext}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-md hover:bg-white/30 rounded-full p-3 border border-white/20"
                >
                  <ChevronRight className="h-5 w-5 text-white" />
                </Button>
              </div>

              {/* Details Section */}
              <div className="p-8 lg:p-10 flex flex-col justify-between min-w-0 flex-shrink-0">
                <div className="space-y-6 lg:space-y-8">
                  <div>
                    <h3 className="text-2xl lg:text-3xl font-bold text-foreground mb-2 text-balance">
                      {currentProperty.title}
                    </h3>
                    <p className="text-3xl lg:text-4xl font-bold text-primary">{currentProperty.price}</p>
                  </div>

                  <div>
                    <h4 className="text-lg font-semibold text-foreground mb-3">Description</h4>
                    <p className="text-muted-foreground leading-relaxed text-pretty">{currentProperty.description}</p>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-lg font-semibold text-foreground">Features</h4>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>• Premium location with easy access to amenities</li>
                      <li>• Modern fixtures and high-quality finishes</li>
                      <li>• Energy-efficient appliances included</li>
                      <li>• Professional property management</li>
                    </ul>
                  </div>
                </div>

                <div className="flex gap-3 pt-6">
                  <Button className="flex-1">Schedule Viewing</Button>
                  <Button variant="outline" className="flex-1 bg-transparent">
                    Contact Agent
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* DinoOverlay - Only active in detail view */}
      <DinoOverlay isDetailView={true} />
    </>
  )
}
