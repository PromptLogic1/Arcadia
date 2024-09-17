import Link from "next/link"
import { GamepadIcon } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Search, Bell, UserPlus, Download, Menu, X } from 'lucide-react'
import { useState } from 'react'
import Popover from "@/components/ui/Popover"

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [notifications, setNotifications] = useState([
    // ... bestehende Benachrichtigungen ...
  ])

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })))
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-cyan-500 bg-gray-900/95 backdrop-blur supports-[backdrop-filter]:bg-gray-900/75">
      {/* ... bestehender Header-Inhalt ... */}
    </header>
  )
}

export default Header