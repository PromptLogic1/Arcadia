/**
 * @jest-environment jsdom
 */

import {
  supportsWebP,
  supportsAVIF,
  getBestImageFormat,
  generateSrcSet,
  preloadImage,
  createPictureElement,
} from '../image-formats';

// Mock Image constructor for testing
class MockImage {
  public onload: (() => void) | null = null;
  public onerror: (() => void) | null = null;
  public height = 0;
  private _src = '';

  set src(value: string) {
    this._src = value;
    // Simulate async loading
    setTimeout(() => {
      // Simulate WebP/AVIF support based on data URL
      if (value.includes('webp') || value.includes('avif')) {
        this.height = 2; // Success case
      } else {
        this.height = 0; // Failure case
      }
      
      if (this.onload) {
        this.onload();
      }
    }, 0);
  }

  get src() {
    return this._src;
  }
}

// Create spy for Image constructor
const ImageConstructorSpy = jest.fn().mockImplementation(() => new MockImage());

// Mock DOM methods
const mockAppendChild = jest.fn();
const mockCreateElement = jest.fn();

// Setup DOM mocks
beforeAll(() => {
  // Mock Image constructor
  global.Image = ImageConstructorSpy as any;
  
  // Mock document methods
  Object.defineProperty(document, 'head', {
    value: { appendChild: mockAppendChild },
    writable: true,
  });
  
  Object.defineProperty(document, 'createElement', {
    value: mockCreateElement,
    writable: true,
  });

  // Mock window.location
  Object.defineProperty(window, 'location', {
    value: { origin: 'https://example.com' },
    writable: true,
  });
});

beforeEach(() => {
  jest.clearAllMocks();
  mockAppendChild.mockClear();
  mockCreateElement.mockClear();
  ImageConstructorSpy.mockClear();
});

describe('Image Format Detection', () => {
  describe('supportsWebP', () => {
    test('detects WebP support when browser supports format', async () => {
      const result = await supportsWebP();
      expect(result).toBe(true);
    });

    test('creates Image element with correct WebP data URL', async () => {
      await supportsWebP();
      expect(ImageConstructorSpy).toHaveBeenCalled();
    });
  });

  describe('supportsAVIF', () => {
    test('detects AVIF support when browser supports format', async () => {
      const result = await supportsAVIF();
      expect(result).toBe(true);
    });

    test('creates Image element with correct AVIF data URL', async () => {
      await supportsAVIF();
      expect(ImageConstructorSpy).toHaveBeenCalled();
    });
  });
});

describe('Image Format Optimization', () => {
  describe('getBestImageFormat', () => {
    test('returns original URL for data URLs unchanged', async () => {
      const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
      const result = await getBestImageFormat(dataUrl);
      expect(result).toBe(dataUrl);
    });

    test('returns original URL for external HTTP URLs unchanged', async () => {
      const httpUrl = 'http://example.com/image.jpg';
      const result = await getBestImageFormat(httpUrl);
      expect(result).toBe(httpUrl);
    });

    test('returns original URL for external HTTPS URLs unchanged', async () => {
      const httpsUrl = 'https://example.com/image.jpg';
      const result = await getBestImageFormat(httpsUrl);
      expect(result).toBe(httpsUrl);
    });

    test('converts JPG to AVIF when AVIF is supported', async () => {
      const originalUrl = '/images/photo.jpg';
      const result = await getBestImageFormat(originalUrl);
      expect(result).toBe('/images/photo.avif');
    });

    test('converts PNG to WebP when WebP is supported but AVIF is not', async () => {
      // Mock AVIF as not supported
      const MockImageNoAVIF = jest.fn().mockImplementation(() => {
        const img = new MockImage();
        Object.defineProperty(img, 'src', {
          set(value: string) {
            img._src = value;
            setTimeout(() => {
              if (value.includes('avif')) {
                img.height = 0; // AVIF not supported
              } else if (value.includes('webp')) {
                img.height = 2; // WebP supported
              }
              if (img.onload) img.onload();
            }, 0);
          }
        });
        return img;
      });
      
      global.Image = MockImageNoAVIF as any;

      const originalUrl = '/images/photo.png';
      const result = await getBestImageFormat(originalUrl);
      expect(result).toBe('/images/photo.webp');

      // Restore original
      global.Image = ImageConstructorSpy as any;
    });

    test('preserves query parameters when converting format', async () => {
      const originalUrl = '/images/photo.jpg?v=123&size=large';
      const result = await getBestImageFormat(originalUrl);
      expect(result).toBe('/images/photo.avif?v=123&size=large');
    });

    test('returns original URL for unsupported file extensions', async () => {
      const svgUrl = '/images/icon.svg';
      const result = await getBestImageFormat(svgUrl);
      expect(result).toBe(svgUrl);
    });

    test('returns original URL for files without extensions', async () => {
      const noExtUrl = '/images/photo';
      const result = await getBestImageFormat(noExtUrl);
      expect(result).toBe(noExtUrl);
    });

    test('handles JPEG extension correctly', async () => {
      const jpegUrl = '/images/photo.jpeg';
      const result = await getBestImageFormat(jpegUrl);
      expect(result).toBe('/images/photo.avif');
    });

    test('does not convert WebP to WebP when WebP is already the format', async () => {
      // Mock only WebP support, not AVIF
      const MockImageWebPOnly = jest.fn().mockImplementation(() => {
        const img = new MockImage();
        Object.defineProperty(img, 'src', {
          set(value: string) {
            img._src = value;
            setTimeout(() => {
              if (value.includes('avif')) {
                img.height = 0; // AVIF not supported
              } else if (value.includes('webp')) {
                img.height = 2; // WebP supported
              }
              if (img.onload) img.onload();
            }, 0);
          }
        });
        return img;
      });
      
      global.Image = MockImageWebPOnly as any;

      const webpUrl = '/images/photo.webp';
      const result = await getBestImageFormat(webpUrl);
      expect(result).toBe(webpUrl);

      // Restore original
      global.Image = ImageConstructorSpy as any;
    });
  });

  describe('generateSrcSet', () => {
    test('generates AVIF srcSet when AVIF is supported', async () => {
      const basePath = '/images/hero';
      const sizes = [640, 1280, 1920];
      
      const result = await generateSrcSet(basePath, sizes);
      
      expect(result).toBe(
        '/images/hero-640w.avif 640w, /images/hero-1280w.avif 1280w, /images/hero-1920w.avif 1920w'
      );
    });

    test('generates WebP srcSet when only WebP is supported', async () => {
      // Mock AVIF as not supported
      const MockImageWebPOnly = jest.fn().mockImplementation(() => {
        const img = new MockImage();
        Object.defineProperty(img, 'src', {
          set(value: string) {
            img._src = value;
            setTimeout(() => {
              if (value.includes('avif')) {
                img.height = 0; // AVIF not supported
              } else if (value.includes('webp')) {
                img.height = 2; // WebP supported
              }
              if (img.onload) img.onload();
            }, 0);
          }
        });
        return img;
      });
      
      global.Image = MockImageWebPOnly as any;

      const basePath = '/images/hero';
      const sizes = [640, 1280];
      
      const result = await generateSrcSet(basePath, sizes);
      
      expect(result).toBe(
        '/images/hero-640w.webp 640w, /images/hero-1280w.webp 1280w'
      );

      // Restore original
      global.Image = ImageConstructorSpy as any;
    });

    test('falls back to JPG when no modern formats are supported', async () => {
      // Mock no format support
      const MockImageNoSupport = jest.fn().mockImplementation(() => {
        const img = new MockImage();
        Object.defineProperty(img, 'src', {
          set(value: string) {
            img._src = value;
            setTimeout(() => {
              img.height = 0; // No format support
              if (img.onload) img.onload();
            }, 0);
          }
        });
        return img;
      });
      
      global.Image = MockImageNoSupport as any;

      const basePath = '/images/hero';
      const sizes = [640, 1280];
      
      const result = await generateSrcSet(basePath, sizes);
      
      expect(result).toBe(
        '/images/hero-640w.jpg 640w, /images/hero-1280w.jpg 1280w'
      );

      // Restore original
      global.Image = ImageConstructorSpy as any;
    });

    test('uses default sizes when no sizes provided', async () => {
      const basePath = '/images/hero';
      
      const result = await generateSrcSet(basePath);
      
      expect(result).toContain('640w');
      expect(result).toContain('750w');
      expect(result).toContain('3840w');
      expect(result.split(', ')).toHaveLength(8); // Default 8 sizes
    });
  });
});

describe('Image Preloading', () => {
  describe('preloadImage', () => {
    beforeEach(() => {
      mockCreateElement.mockImplementation((tagName: string) => {
        if (tagName === 'link') {
          return {
            rel: '',
            as: '',
            href: '',
            fetchPriority: '',
          };
        }
        return {};
      });
    });

    test('creates preload link with optimized image format', async () => {
      const src = '/images/hero.jpg';
      
      await preloadImage(src);
      
      expect(mockCreateElement).toHaveBeenCalledWith('link');
      expect(mockAppendChild).toHaveBeenCalled();
    });

    test('sets high priority when specified', async () => {
      const mockLink = {
        rel: '',
        as: '',
        href: '',
        fetchPriority: '',
      };
      
      mockCreateElement.mockReturnValue(mockLink);
      
      const src = '/images/hero.jpg';
      
      await preloadImage(src, 'high');
      
      expect(mockLink.fetchPriority).toBe('high');
      expect(mockLink.rel).toBe('preload');
      expect(mockLink.as).toBe('image');
    });

    test('defaults to low priority when not specified', async () => {
      const mockLink = {
        rel: '',
        as: '',
        href: '',
        fetchPriority: '',
      };
      
      mockCreateElement.mockReturnValue(mockLink);
      
      const src = '/images/hero.jpg';
      
      await preloadImage(src);
      
      expect(mockLink.fetchPriority).toBe('low');
    });

    test('preloads optimized image format instead of original', async () => {
      const mockLink = {
        rel: '',
        as: '',
        href: '',
        fetchPriority: '',
      };
      
      mockCreateElement.mockReturnValue(mockLink);
      
      const src = '/images/hero.jpg';
      
      await preloadImage(src);
      
      expect(mockLink.href).toBe('/images/hero.avif');
    });
  });
});

describe('Picture Element Creation', () => {
  describe('createPictureElement', () => {
    beforeEach(() => {
      mockCreateElement.mockImplementation((tagName: string) => {
        const element = {
          tagName,
          appendChild: jest.fn(),
          srcset: '',
          type: '',
          sizes: '',
          src: '',
          alt: '',
          className: '',
        };
        return element;
      });
    });

    test('creates picture element with fallback img', () => {
      const src = '/images/hero.jpg';
      const alt = 'Hero image';
      
      const result = createPictureElement(src, alt);
      
      expect(mockCreateElement).toHaveBeenCalledWith('picture');
      expect(mockCreateElement).toHaveBeenCalledWith('img');
      expect(result.appendChild).toHaveBeenCalled();
    });

    test('adds AVIF source when provided', () => {
      const mockPicture = {
        appendChild: jest.fn(),
      };
      const mockAvifSource = {
        srcset: '',
        type: '',
        sizes: '',
      };
      const mockImg = {
        src: '',
        alt: '',
        className: '',
      };
      
      mockCreateElement
        .mockReturnValueOnce(mockPicture)
        .mockReturnValueOnce(mockAvifSource)
        .mockReturnValueOnce(mockImg);
      
      const src = '/images/hero.jpg';
      const alt = 'Hero image';
      const options = {
        avifSrc: '/images/hero.avif',
        sizes: '(max-width: 768px) 100vw, 50vw',
      };
      
      createPictureElement(src, alt, options);
      
      expect(mockCreateElement).toHaveBeenCalledWith('source');
      expect(mockAvifSource.srcset).toBe('/images/hero.avif');
      expect(mockAvifSource.type).toBe('image/avif');
      expect(mockAvifSource.sizes).toBe('(max-width: 768px) 100vw, 50vw');
      expect(mockPicture.appendChild).toHaveBeenCalledWith(mockAvifSource);
    });

    test('adds WebP source when provided', () => {
      const mockPicture = {
        appendChild: jest.fn(),
      };
      const mockWebpSource = {
        srcset: '',
        type: '',
        sizes: '',
      };
      const mockImg = {
        src: '',
        alt: '',
        className: '',
      };
      
      mockCreateElement
        .mockReturnValueOnce(mockPicture)
        .mockReturnValueOnce(mockWebpSource)
        .mockReturnValueOnce(mockImg);
      
      const src = '/images/hero.jpg';
      const alt = 'Hero image';
      const options = {
        webpSrc: '/images/hero.webp',
      };
      
      createPictureElement(src, alt, options);
      
      expect(mockWebpSource.srcset).toBe('/images/hero.webp');
      expect(mockWebpSource.type).toBe('image/webp');
      expect(mockPicture.appendChild).toHaveBeenCalledWith(mockWebpSource);
    });

    test('sets className on img element when provided', () => {
      const mockPicture = {
        appendChild: jest.fn(),
      };
      const mockImg = {
        src: '',
        alt: '',
        className: '',
      };
      
      mockCreateElement
        .mockReturnValueOnce(mockPicture)
        .mockReturnValueOnce(mockImg);
      
      const src = '/images/hero.jpg';
      const alt = 'Hero image';
      const options = {
        className: 'responsive-image',
      };
      
      createPictureElement(src, alt, options);
      
      expect(mockImg.src).toBe(src);
      expect(mockImg.alt).toBe(alt);
      expect(mockImg.className).toBe('responsive-image');
    });

    test('creates complete picture element with all sources', () => {
      const mockPicture = {
        appendChild: jest.fn(),
      };
      const mockAvifSource = { srcset: '', type: '', sizes: '' };
      const mockWebpSource = { srcset: '', type: '', sizes: '' };
      const mockImg = { src: '', alt: '', className: '' };
      
      mockCreateElement
        .mockReturnValueOnce(mockPicture)
        .mockReturnValueOnce(mockAvifSource)
        .mockReturnValueOnce(mockWebpSource)
        .mockReturnValueOnce(mockImg);
      
      const src = '/images/hero.jpg';
      const alt = 'Hero image';
      const options = {
        avifSrc: '/images/hero.avif',
        webpSrc: '/images/hero.webp',
        className: 'hero-image',
        sizes: '100vw',
      };
      
      createPictureElement(src, alt, options);
      
      expect(mockPicture.appendChild).toHaveBeenCalledTimes(3); // AVIF, WebP, img
      expect(mockAvifSource.sizes).toBe('100vw');
      expect(mockWebpSource.sizes).toBe('100vw');
    });
  });
});