"use client"

import { useState } from "react"
import { PropertyPreviewCard } from "@/components/property-preview-card"
import { PropertyDetailModal } from "@/components/property-detail-modal"

interface Property {
  id: number
  title: string
  description: string
  price: string
  image: string
}

const properties: Property[] = [
  {
    id: 1,
    title: "Modern Loft in Downtown",
    description:
      "Spacious open-concept loft with exposed brick walls and floor-to-ceiling windows. Perfect for urban professionals.",
    price: "$250,000",
    image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop&crop=center",
  },
  {
    id: 2,
    title: "Luxury Penthouse Suite",
    description: "Stunning penthouse with panoramic city views, marble countertops, and premium finishes throughout.",
    price: "$850,000",
    image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&h=600&fit=crop&crop=center",
  },
  {
    id: 3,
    title: "Cozy Suburban Home",
    description:
      "Beautiful 3-bedroom family home with a large backyard, updated kitchen, and quiet neighborhood setting.",
    price: "$425,000",
    image: "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&h=600&fit=crop&crop=center",
  },
  {
    id: 4,
    title: "Contemporary Condo",
    description: "Sleek 2-bedroom condo with modern amenities, in-unit laundry, and access to building fitness center.",
    price: "$320,000",
    image: "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&h=600&fit=crop&crop=center",
  },
  {
    id: 5,
    title: "Charming Victorian House",
    description:
      "Historic Victorian home with original hardwood floors, bay windows, and beautifully landscaped garden.",
    price: "$675,000",
    image: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop&crop=center",
  },
  {
    id: 6,
    title: "Minimalist Studio Apartment",
    description:
      "Bright and airy studio with high ceilings, modern fixtures, and prime location near public transportation.",
    price: "$180,000",
    image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop&crop=center",
  },
]

export default function HomePage() {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleOpenDetail = (property: Property) => {
    setSelectedProperty(property)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedProperty(null)
  }

  return (
    <div className="min-h-screen bg-orange-50">
      {/* Header */}
      <header className="border-b border-border bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-foreground">DreamSpace Realty</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="mb-12 text-center">
          <h2 className="text-4xl font-bold text-foreground mb-4">Find Your Dream Home</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover exceptional properties in prime locations. From modern lofts to charming family homes, we have the
            perfect space for your next chapter.
          </p>
        </div>

        {/* Property Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {properties.map((property) => (
            <PropertyPreviewCard key={property.id} property={property} onOpenDetail={handleOpenDetail} />
          ))}
        </div>
      </main>

      <PropertyDetailModal
        property={selectedProperty}
        properties={properties}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  )
}
