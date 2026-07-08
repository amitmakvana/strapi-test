module.exports = ({ env }) => {
  const hasCloudinary =
    env('CLOUDINARY_CLOUD_NAME')
    && env('CLOUDINARY_API_KEY')
    && env('CLOUDINARY_API_SECRET')

  if (!hasCloudinary) return {}

  return {
    upload: {
      config: {
        provider: 'cloudinary',
        providerOptions: {
          cloud_name: env('CLOUDINARY_CLOUD_NAME'),
          api_key: env('CLOUDINARY_API_KEY'),
          api_secret: env('CLOUDINARY_API_SECRET'),
        },
        actionOptions: {
          upload: {
            folder: env('CLOUDINARY_FOLDER', 'five-tech/blogs'),
            quality: 'auto:good',
            fetch_format: 'auto',
          },
          uploadStream: {
            folder: env('CLOUDINARY_FOLDER', 'five-tech/blogs'),
            quality: 'auto:good',
            fetch_format: 'auto',
          },
          delete: {},
        },
      },
    },
  }
}
