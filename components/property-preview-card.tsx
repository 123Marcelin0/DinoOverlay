"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Edit3 } from "lucide-react"

interface Property {
  id: number
  title: string
  description: string
  price: string
  image: string
}

interface PropertyPreviewCardProps {
  property: Property
  onOpenDetail: (property: Property) => void
}

export function PropertyPreviewCard({ property, onOpenDetail }: PropertyPreviewCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onOpenDetail(property)
  }

  return (
    <Card
      className="overflow-hidden hover:shadow-lg transition-shadow duration-300 bg-card border border-border cursor-pointer"
      onClick={() => onOpenDetail(property)}
    >
      <div
        className="aspect-[4/3] overflow-hidden relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <img
          src={property.image || "/placeholder.svg"}
          alt={property.title}
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
        />

        {isHovered && (
          <Button
            onClick={handleEditClick}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-md hover:bg-white/30 border border-white/20 text-white shadow-lg transition-all duration-200 opacity-0 animate-in fade-in-0 zoom-in-95"
            style={{ opacity: 1 }}
            size="sm"
          >
            <Edit3 className="h-4 w-4 mr-2" />
            Edit this room
          </Button>
        )}
      </div>

      <CardContent className="p-6">
        <div className="space-y-3">
          <h3 className="text-xl font-semibold text-card-foreground line-clamp-1">{property.title}</h3>
          <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">{property.description}</p>
          <div className="flex items-center justify-between pt-2">
            <span className="text-2xl font-bold text-primary">{property.price}</span>
            <Button variant="outline" size="sm" className="text-sm bg-transparent">
              View Details
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
