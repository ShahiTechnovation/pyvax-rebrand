import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChevronRight } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center space-y-6">
        <div className="space-y-2">
          <div className="text-8xl md:text-9xl font-bold font-heading bg-gradient-to-r from-red-400 to-pink-400 bg-clip-text text-transparent">
            404
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white">Page Not Found</h1>
        </div>

        <p className="text-gray-400 text-lg max-w-md mx-auto">
          The page you're looking for doesn't exist. It might have been moved or deleted.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Link href="/">
            <Button size="lg" className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white">
              Go Home
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
          <Link href="/docs">
            <Button size="lg" variant="outline" className="border-white/20 hover:bg-white/5">
              View Docs
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
