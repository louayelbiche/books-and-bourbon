'use client';

import { useState, useCallback } from 'react';
import type { PanelItem } from './usePanel.js';
import {
  copyToClipboard,
  downloadBlob,
  downloadImageUrl,
  formatPanelItem,
  getPanelItemFilename,
  hasDownloadableImage,
  getImageUrl,
  hasDownloadableHtml,
  getHtmlContent,
} from '../utils/panel-export.js';

/**
 * Hook that provides copy/download actions for panel items.
 *
 * `copying` holds the item ID currently being copied (for brief "Copied!" feedback),
 * or null when idle.
 */
export function usePanelExport() {
  const [copying, setCopying] = useState<string | null>(null);

  /** Copy the formatted text of a panel item to the clipboard. */
  const copyItem = useCallback(async (item: PanelItem): Promise<void> => {
    const text = formatPanelItem(item);
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopying(item.id);
      setTimeout(() => setCopying(null), 1500);
    }
  }, []);

  /** Download a panel item as a text file (markdown, CSV, or plain text). */
  const downloadItem = useCallback((item: PanelItem): void => {
    // If the item has downloadable HTML, prefer that
    if (hasDownloadableHtml(item)) {
      const html = getHtmlContent(item)!;
      const blob = new Blob([html], { type: 'text/html' });
      const filename = `${item.type}-${item.id}.html`;
      downloadBlob(blob, filename);
      return;
    }

    // If the item has a downloadable image, download it
    if (hasDownloadableImage(item)) {
      const url = getImageUrl(item)!;
      const ext = url.includes('.png') ? 'png' : 'jpg';
      const filename = `${item.type}-${item.id}.${ext}`;
      void downloadImageUrl(url, filename);
      return;
    }

    // Default: download formatted text
    const text = formatPanelItem(item);
    const filename = getPanelItemFilename(item);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    downloadBlob(blob, filename);
  }, []);

  /** Download just the image from an image-bearing panel item. */
  const downloadItemImage = useCallback(
    async (item: PanelItem): Promise<void> => {
      const url = getImageUrl(item);
      if (!url) return;
      const ext = url.includes('.png') ? 'png' : 'jpg';
      const filename = `${item.type}-${item.id}.${ext}`;
      await downloadImageUrl(url, filename);
    },
    [],
  );

  /** Download the HTML content from an email/newsletter panel item. */
  const downloadItemHtml = useCallback((item: PanelItem): void => {
    const html = getHtmlContent(item);
    if (!html) return;
    const blob = new Blob([html], { type: 'text/html' });
    const filename = `${item.type}-${item.id}.html`;
    downloadBlob(blob, filename);
  }, []);

  return { copyItem, downloadItem, downloadItemImage, downloadItemHtml, copying };
}
