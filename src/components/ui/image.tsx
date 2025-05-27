import NextImage from 'next/image'
import type { ImageProps } from 'next/image'
import { useState } from 'react'

interface OptimizedImageProps extends Omit<ImageProps, 'onError' | 'onLoad'> {
  fallbackSrc?: string
}

export function OptimizedImage({
  src,
  alt,
  fallbackSrc = '/images/placeholder.jpg',
  width,
  height,
  ...props
}: OptimizedImageProps) {
  const [imgSrc, setImgSrc] = useState(src)

  return (
    <NextImage
      {...props}
      src={imgSrc}
      alt={alt}
      width={width}
      height={height}
      onError={() => setImgSrc(fallbackSrc)}
      placeholder="blur"
      blurDataURL="/images/placeholder-blur.jpg"
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      quality={75}
    />
  )
} 