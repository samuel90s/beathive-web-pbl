// src/types/index.ts

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  provider: string;
  createdAt: string;
  subscription?: Subscription;
}

export interface Plan {
  id: string;
  name: string;
  slug: 'free' | 'pro' | 'business';
  priceMonthly: number;
  priceYearly: number;
  downloadLimit: number;
  commercialLicense: boolean;
  unlimited: boolean;
}

export interface Subscription {
  id: string;
  status: 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED' | 'CANCELLED';
  billingCycle: 'MONTHLY' | 'YEARLY';
  currentPeriodEnd: string;
  cancelledAt?: string;
  plan: Plan;
  usage?: {
    downloadsThisMonth: number;
    downloadLimit: number;
    remaining: number | null;
    unlimited: boolean;
  };
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
}

export interface SoundEffect {
  id: string;
  title: string;
  slug: string;
  description?: string;
  previewUrl: string;
  waveformData: number[];
  durationMs: number;
  format: string;
  price: number;
  isFree: boolean;
  accessLevel: 'FREE' | 'PRO' | 'BUSINESS' | 'PURCHASE';
  licenseType: string;
  playCount: number;
  downloadCount: number;
  category: Category;
  tags: Tag[];
  publishedAt: string;
}

export interface Order {
  id: string;
  totalAmount: number;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  paidAt?: string;
  createdAt: string;
  items: OrderItem[];
  invoice?: Invoice;
}

export interface OrderItem {
  id: string;
  priceSnapshot: number;
  licenseType: string;
  licensePdfUrl?: string;
  soundEffect: SoundEffect;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  pdfUrl?: string;
  issuedAt: string;
}

export interface SoundsResponse {
  items: SoundEffect[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface SoundFilters {
  search?: string;
  categorySlug?: string;
  isFree?: boolean;
  minDuration?: number;
  maxDuration?: number;
  sortBy?: 'newest' | 'popular' | 'price_asc' | 'price_desc';
  page?: number;
  limit?: number;
}

export interface CartItem {
  sound: SoundEffect;
  licenseType: 'personal' | 'commercial';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
