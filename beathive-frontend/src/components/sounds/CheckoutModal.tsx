'use client'
// src/components/sounds/CheckoutModal.tsx
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SoundEffect } from '@/types'
import { ordersApi, api } from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'
import toast from 'react-hot-toast'
import { X, ShoppingCart, FileText, Briefcase, Check } from 'lucide-react'
import clsx from 'clsx'

interface Props {
  sound: SoundEffect | null
  onClose: () => void
}

type LicenseType = 'personal' | 'commercial'

export default function CheckoutModal({ sound, onClose }: Props) {
  const [licenseType, setLicenseType] = useState<LicenseType>('personal')
  const [isLoading, setIsLoading] = useState(false)
  const { user } = useAuthStore()
  const router = useRouter()

  if (!sound) return null

  const personalPrice = sound.price
  const commercialPrice = sound.price * 2
  const selectedPrice = licenseType === 'personal' ? personalPrice : commercialPrice

  const handleCheckout = async () => {
    if (!user) {
      toast.error('Please log in to make a purchase')
      return
    }

    setIsLoading(true)
    try {
      const { data } = await ordersApi.create([
        { soundEffectId: sound.id, licenseType },
      ])

      // Buka Midtrans Snap popup
      // Pastikan script Midtrans sudah di-load di layout.tsx
      const snap = (window as any).snap
      if (!snap) {
        toast.error('Payment system not ready, please try again')
        return
      }

      snap.pay(data.snapToken, {
        onSuccess: async () => {
          try { await api.post('/orders/verify-payment', { orderId: data.orderId }) } catch { /* webhook may have fired first */ }
          onClose()
          router.push(`/orders/${data.orderId}/success`)
        },
        onPending: () => {
          toast('Payment pending, please complete your payment.', { icon: '⏳' })
          onClose()
          router.push(`/orders/${data.orderId}/success?status=pending`)
        },
        onError: () => {
          toast.error('Payment failed, please try again.')
        },
        onClose: () => {
          // User menutup popup tanpa bayar — tidak perlu apa-apa
        },
      })
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create order')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Buy Sound Effect</h2>
            <p className="text-sm text-gray-500 mt-0.5 truncate max-w-xs">{sound.title}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Pilih lisensi */}
        <div className="p-6 space-y-3">
          <p className="text-sm font-medium text-gray-700 mb-3">Select license type:</p>

          {/* Personal */}
          <button
            onClick={() => setLicenseType('personal')}
            className={clsx(
              'w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all',
              licenseType === 'personal'
                ? 'border-violet-500 bg-violet-50'
                : 'border-gray-100 hover:border-gray-200'
            )}
          >
            <div className={clsx(
              'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
              licenseType === 'personal' ? 'bg-violet-100' : 'bg-gray-100'
            )}>
              <FileText size={18} className={licenseType === 'personal' ? 'text-violet-600' : 'text-gray-400'} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900">Personal License</p>
                <p className="text-sm font-bold text-violet-700">
                  Rp {personalPrice.toLocaleString('id-ID')}
                </p>
              </div>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                For personal projects, non-monetized YouTube content, podcasts, and non-commercial use.
              </p>
              <ul className="mt-2 space-y-0.5">
                {['YouTube & social media (non-monetized)', 'Personal podcasts', 'School/university projects'].map((item) => (
                  <li key={item} className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Check size={11} className="text-green-500 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            {licenseType === 'personal' && (
              <div className="w-5 h-5 rounded-full bg-violet-600 flex items-center justify-center shrink-0 mt-0.5">
                <Check size={12} className="text-white" />
              </div>
            )}
          </button>

          {/* Commercial */}
          <button
            onClick={() => setLicenseType('commercial')}
            className={clsx(
              'w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all',
              licenseType === 'commercial'
                ? 'border-violet-500 bg-violet-50'
                : 'border-gray-100 hover:border-gray-200'
            )}
          >
            <div className={clsx(
              'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
              licenseType === 'commercial' ? 'bg-violet-100' : 'bg-gray-100'
            )}>
              <Briefcase size={18} className={licenseType === 'commercial' ? 'text-violet-600' : 'text-gray-400'} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900">Commercial License</p>
                  <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-medium">Popular</span>
                </div>
                <p className="text-sm font-bold text-violet-700">
                  Rp {commercialPrice.toLocaleString('id-ID')}
                </p>
              </div>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                For ads, films, paid content, apps, and all commercial uses.
              </p>
              <ul className="mt-2 space-y-0.5">
                {['Ads & commercial videos', 'Films & paid content', 'Apps & games', 'Monetized YouTube'].map((item) => (
                  <li key={item} className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Check size={11} className="text-green-500 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            {licenseType === 'commercial' && (
              <div className="w-5 h-5 rounded-full bg-violet-600 flex items-center justify-center shrink-0 mt-0.5">
                <Check size={12} className="text-white" />
              </div>
            )}
          </button>
        </div>

        {/* Footer */}
        <div className="p-6 pt-0">
          <div className="flex items-center justify-between mb-4 px-1">
            <span className="text-sm text-gray-500">Total payment</span>
            <span className="text-xl font-bold text-gray-900">
              Rp {selectedPrice.toLocaleString('id-ID')}
            </span>
          </div>

          <button
            onClick={handleCheckout}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-300 text-white font-semibold rounded-xl transition-colors"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <ShoppingCart size={16} />
                Proceed to Payment
              </>
            )}
          </button>

          <p className="text-center text-xs text-gray-400 mt-3">
            Secure payment via Midtrans · QRIS, Bank Transfer, Credit Card
          </p>
        </div>
      </div>
    </div>
  )
}
