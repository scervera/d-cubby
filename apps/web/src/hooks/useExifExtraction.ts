import { useState } from 'react'
import EXIF from 'exif-js'

export interface ExifData {
  camera_make?: string
  camera_model?: string
  lens_model?: string
  aperture?: number
  shutter_speed?: number
  iso?: number
  focal_length?: number
  flash?: number
  white_balance?: number
  metering_mode?: number
  exposure_mode?: number
  date_taken?: string
  date_digitized?: string
  gps_latitude?: number
  gps_longitude?: number
  gps_altitude?: number
  software?: string
  artist?: string
  copyright?: string
}

export interface ImageDimensions {
  width: number
  height: number
}

export function useExifExtraction() {
  const [extracting, setExtracting] = useState(false)

  const extractExifData = (file: File): Promise<{ exifData: ExifData | null; dimensions: ImageDimensions | null }> => {
    return new Promise((resolve) => {
      setExtracting(true)
      
      // Check if it's an image file
      if (!file.type.startsWith('image/')) {
        setExtracting(false)
        resolve({ exifData: null, dimensions: null })
        return
      }

      const img = new Image()
      const url = URL.createObjectURL(file)
      
      img.onload = () => {
        // Extract dimensions
        const dimensions: ImageDimensions = {
          width: img.naturalWidth,
          height: img.naturalHeight
        }

        // Extract EXIF data
        // exif-js accepts an <img>, though its typings only declare string.
        EXIF.getData(img as unknown as string, () => {
          const exifData: ExifData = {}

          // Camera information
          if (EXIF.getTag(img, 'Make')) exifData.camera_make = EXIF.getTag(img, 'Make')
          if (EXIF.getTag(img, 'Model')) exifData.camera_model = EXIF.getTag(img, 'Model')
          if (EXIF.getTag(img, 'LensModel')) exifData.lens_model = EXIF.getTag(img, 'LensModel')

          // Camera settings
          if (EXIF.getTag(img, 'FNumber')) exifData.aperture = EXIF.getTag(img, 'FNumber')
          if (EXIF.getTag(img, 'ExposureTime')) exifData.shutter_speed = EXIF.getTag(img, 'ExposureTime')
          if (EXIF.getTag(img, 'ISOSpeedRatings')) exifData.iso = EXIF.getTag(img, 'ISOSpeedRatings')
          if (EXIF.getTag(img, 'FocalLength')) exifData.focal_length = EXIF.getTag(img, 'FocalLength')
          if (EXIF.getTag(img, 'Flash')) exifData.flash = EXIF.getTag(img, 'Flash')

          // Image properties
          if (EXIF.getTag(img, 'WhiteBalance')) exifData.white_balance = EXIF.getTag(img, 'WhiteBalance')
          if (EXIF.getTag(img, 'MeteringMode')) exifData.metering_mode = EXIF.getTag(img, 'MeteringMode')
          if (EXIF.getTag(img, 'ExposureMode')) exifData.exposure_mode = EXIF.getTag(img, 'ExposureMode')

          // Date and time
          if (EXIF.getTag(img, 'DateTimeOriginal')) exifData.date_taken = EXIF.getTag(img, 'DateTimeOriginal')
          if (EXIF.getTag(img, 'DateTimeDigitized')) exifData.date_digitized = EXIF.getTag(img, 'DateTimeDigitized')

          // GPS information
          if (EXIF.getTag(img, 'GPSLatitude') && EXIF.getTag(img, 'GPSLongitude')) {
            exifData.gps_latitude = EXIF.getTag(img, 'GPSLatitude')
            exifData.gps_longitude = EXIF.getTag(img, 'GPSLongitude')
            if (EXIF.getTag(img, 'GPSAltitude')) exifData.gps_altitude = EXIF.getTag(img, 'GPSAltitude')
          }

          // Software
          if (EXIF.getTag(img, 'Software')) exifData.software = EXIF.getTag(img, 'Software')
          if (EXIF.getTag(img, 'Artist')) exifData.artist = EXIF.getTag(img, 'Artist')
          if (EXIF.getTag(img, 'Copyright')) exifData.copyright = EXIF.getTag(img, 'Copyright')

          // Clean up
          URL.revokeObjectURL(url)
          setExtracting(false)

          // Return data (only if there's actual EXIF data)
          const hasExifData = Object.keys(exifData).length > 0
          resolve({
            exifData: hasExifData ? exifData : null,
            dimensions
          })
        })
      }

      img.onerror = () => {
        URL.revokeObjectURL(url)
        setExtracting(false)
        resolve({ exifData: null, dimensions: null })
      }

      img.src = url
    })
  }

  return {
    extractExifData,
    extracting
  }
}
