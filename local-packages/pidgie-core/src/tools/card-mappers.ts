/**
 * Card Mappers — Business Data → ValidatedCard
 *
 * Registers mappers that transform Pidgie business data records
 * into ValidatedCards. Called once at module load.
 */

import { registerCardMapper } from '@runwell/card-system/validation';
import type { Product, Service } from '../types/index.js';

/**
 * Register all Pidgie card mappers.
 * Must be called before any card retrieval tools are used.
 */
export function registerPidgieCardMappers(): void {
  registerCardMapper<Product>('product', (record, tenantId) => ({
    type: 'product',
    id: record.id,
    data: {
      name: record.name,
      description: record.description,
      category: record.category,
      price: record.price.amount,
      currency: record.price.currency,
      compareAtPrice: record.price.compareAt,
      image: record.images?.find((img) => img.primary)?.url ?? record.images?.[0]?.url,
      imageAlt: record.images?.find((img) => img.primary)?.alt ?? record.name,
      available: record.available,
      stockStatus: record.stockStatus,
      featured: record.featured,
      variants: record.variants?.map((v) => ({
        id: v.id,
        name: v.name,
        price: v.price?.amount,
        available: v.available,
      })),
      tags: record.tags,
    },
    source: {
      table: 'Product',
      recordId: record.id,
      tenantId,
      validatedAt: Date.now(),
    },
  }));

  registerCardMapper<Service>('service', (record, tenantId) => ({
    type: 'service',
    id: record.id,
    data: {
      name: record.name,
      description: record.description,
      category: record.category,
      price: record.price?.amount,
      currency: record.price?.currency,
      priceUnit: record.price?.unit,
      duration: record.duration,
      available: record.available,
    },
    source: {
      table: 'Service',
      recordId: record.id,
      tenantId,
      validatedAt: Date.now(),
    },
  }));

  // Event mapper — uses a generic record shape since events
  // come from various sources (booking resources, special hours, etc.)
  registerCardMapper('event', (record: any, tenantId) => ({
    type: 'event',
    id: record.id,
    data: {
      name: record.name,
      description: record.description,
      date: record.date,
      startTime: record.startTime,
      endTime: record.endTime,
      location: record.location,
      capacity: record.capacity,
      price: record.price?.amount,
      currency: record.price?.currency,
    },
    source: {
      table: 'Event',
      recordId: record.id,
      tenantId,
      validatedAt: Date.now(),
    },
  }));
}

