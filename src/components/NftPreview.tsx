import { NftData } from '@/bindings';
import { isImage, isVideo, isText, isJson, isSvg, nftUri } from '@/lib/nftUri';
import { cn } from '@/lib/utils';
import { createSvgBlobUrl } from '@/lib/security';
import { t } from '@lingui/core/macro';
import { useEffect, useRef, useState } from 'react';

interface NftPreviewProps {
  data: NftData | null;
  compact?: boolean;
  className?: string;
  name?: string | null;
}

// Count emoji sequences as single characters
const getVisualLength = (str: string) => {
  return str.replace(
    /\p{Emoji_Modifier_Base}\p{Emoji_Modifier}|\p{Emoji}(\u200d\p{Emoji})*|\p{Emoji}/gu,
    '_',
  ).length;
};

export function NftPreview({
  data,
  compact = false,
  className,
  name,
}: NftPreviewProps) {
  const textRef = useRef<HTMLPreElement>(null);
  const uri = nftUri(data?.mime_type ?? null, data?.blob ?? null);

  // For SVG content, create a sandboxed blob URL
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isSvg(data?.mime_type) && data?.blob) {
      try {
        const svgContent = atob(data.blob);
        const url = createSvgBlobUrl(svgContent);
        setBlobUrl(url);
        return () => URL.revokeObjectURL(url);
      } catch (e) {
        console.warn('Failed to create SVG blob URL:', e);
      }
    }
  }, [data?.mime_type, data?.blob]);

  useEffect(() => {
    const el = textRef.current;
    if (el && (isText(data?.mime_type) || isJson(data?.mime_type))) {
      el.style.opacity = '0';

      // Get content dimensions
      const content = el.textContent || '';
      const lines = content.split('\n');
      const maxLineLength = Math.max(
        ...lines.map((line) => getVisualLength(line)),
      );
      const lineCount = lines.length;

      // Get container dimensions
      const { width, height } = el.getBoundingClientRect();

      // Container dimensions in character units (assuming 16px per char)
      const containerColumns = width / 16;
      const containerRows = height / 16;

      // Calculate scaling factors based on content
      const contentColumns = maxLineLength;
      const contentRows = lineCount;

      // Scale based on both container and content
      const columnScale = containerColumns / contentColumns;
      const rowScale = containerRows / contentRows;

      // Base scale (from original implementation)
      const baseScale = compact ? 40 : 95;

      // For multi-line content, we should be more conservative with height scaling
      const heightAdjustment = lineCount > 1 ? 0.45 : 1;

      // Apply the most constraining scale
      const scale = Math.min(
        baseScale,
        baseScale * columnScale,
        baseScale * rowScale * heightAdjustment,
      );

      // Use container dimensions instead of viewport units
      const containerWidth = compact ? 400 : 900;
      const containerHeight = compact ? 400 : 900;

      el.style.fontSize = `min(${(scale * containerWidth) / (100 * containerColumns)}px, ${(scale * containerHeight) / (100 * containerRows)}px)`;
      el.style.opacity = '1';

      // Special case for very short content
      if (contentColumns <= 4 && contentRows <= 4) {
        const singleCharScale = compact ? 140 : 500;
        el.style.fontSize = `min(${(singleCharScale * containerWidth) / (100 * containerColumns)}px, ${(singleCharScale * containerHeight) / (100 * containerRows)}px)`;
      }
    }
  }, [data?.mime_type, compact]);

  if (isImage(data?.mime_type ?? null)) {
    // Special handling for SVGs using sandboxed iframe
    if (isSvg(data?.mime_type)) {
      return blobUrl ? (
        <iframe
          title={name ?? t`SVG content`}
          src={blobUrl}
          sandbox="allow-scripts"
          className={cn(
            'h-auto w-auto border-0 bg-transparent transition-all duration-200',
            compact && 'group-hover/nft:scale-105',
            className
          )}
          style={{
            width: compact ? '150px' : '400px',
            height: compact ? '150px' : '400px',
          }}
        />
      ) : (
        // Fallback if blob URL creation fails
        <div className={cn(
          'flex items-center justify-center aspect-square bg-gray-100 text-gray-400',
          className
        )}>
          <span className='text-sm'>{t`Invalid SVG content`}</span>
        </div>
      );
    }

    // Regular image handling
    return (
      <img
        alt={name ?? t`NFT artwork for unnamed NFT`}
        loading='lazy'
        width='150'
        height='150'
        className={cn(
          'h-auto w-auto object-cover transition-all duration-200 aspect-square color-[transparent]',
          compact && 'group-hover/nft:scale-105',
          className,
        )}
        src={uri}
      />
    );
  }

  if (isVideo(data?.mime_type ?? null)) {
    return (
      <video
        src={uri}
        controls
        className={cn(
          'h-auto w-auto object-cover transition-all duration-200 aspect-square',
          compact && 'group-hover/nft:scale-105',
          className,
        )}
      />
    );
  }

  if (isJson(data?.mime_type ?? null) || isText(data?.mime_type ?? null)) {
    // Content is already sanitized by nftUri
    const content = uri;

    return (
      <div
        className={cn(
          'grid h-full w-full place-items-center overflow-visible',
          className,
        )}
        style={{
          gridTemplate: '1fr / 1fr',
          height: compact ? '150px' : '400px',
        }}
      >
        <pre
          ref={textRef}
          className={cn(
            'm-0 p-2 whitespace-pre-wrap break-words',
            isJson(data?.mime_type)
              ? 'font-mono text-left'
              : 'font-sans text-center',
            'bg-white border border-neutral-200 rounded-lg transition-all duration-200',
            compact && 'group-hover/nft:scale-105',
          )}
          style={{
            gridColumn: '1 / 1',
            gridRow: '1 / 1',
            width: compact ? '150px' : '400px',
            opacity: 0,
            maxHeight: compact ? '150px' : '80vh',
            transform: 'scale(1)',  // Initial scale
            transformOrigin: 'center',
            willChange: 'transform',  // Optimize transitions
          }}
        >
          {content}
        </pre>
      </div>
    );
  }

  // Fallback for unsupported types
  return (
    <div
      className={cn(
        'flex items-center justify-center aspect-square bg-gray-100 text-gray-400',
        className,
      )}
    >
      <span className='text-sm'>{t`Unsupported content type`}</span>
    </div>
  );
}
