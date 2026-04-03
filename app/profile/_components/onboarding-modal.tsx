'use client'

import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ProfileForm } from './profile-form'

type OnboardingModalProps = {
  defaultValues?: {
    display_name: string | null
    base_currency: string
    country: string
    risk_tolerance: string
  }
}

export const OnboardingModal = ({ defaultValues }: OnboardingModalProps) => {
  const router = useRouter()

  return (
    <Dialog open>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-tight">
            Welcome! Set up your profile
          </DialogTitle>
          <DialogDescription>
            Configure your preferences to personalize your finance dashboard.
          </DialogDescription>
        </DialogHeader>
        <ProfileForm defaultValues={defaultValues} onSuccess={() => router.refresh()} />
      </DialogContent>
    </Dialog>
  )
}
