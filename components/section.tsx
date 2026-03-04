import React from 'react'

interface SectionProps {
  children: React.ReactNode
  className?: string
  id?: string
}

export function Section({ children, className = '', id }: SectionProps) {
  return (
    <section id={id} className={`py-16 md:py-24 lg:py-32 ${className}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {children}
      </div>
    </section>
  )
}

interface SectionHeadingProps {
  children: React.ReactNode
  className?: string
}

export function SectionHeading({ children, className = '' }: SectionHeadingProps) {
  return (
    <h2 className={`text-3xl md:text-4xl lg:text-5xl font-bold font-heading text-balance ${className}`}>
      {children}
    </h2>
  )
}

interface SectionSubheadingProps {
  children: React.ReactNode
  className?: string
}

export function SectionSubheading({ children, className = '' }: SectionSubheadingProps) {
  return (
    <p className={`text-lg md:text-xl text-gray-400 text-balance max-w-2xl ${className}`}>
      {children}
    </p>
  )
}
