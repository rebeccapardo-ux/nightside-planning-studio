import type { Metadata } from 'next'
import AppHome from './AppHome'

export const metadata: Metadata = {
  title: 'Home',
}

export default function AppHomePage() {
  return <AppHome />
}
