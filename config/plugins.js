const CMS = require('./hardcoded');

module.exports = ({ env }) => ({
  'users-permissions': {
    config: {
      jwtSecret: env('JWT_SECRET', CMS.jwtSecret),
    },
  },
  upload: {
    config: {
      provider: 'cloudinary',
      providerOptions: {
        cloud_name: env('CLOUDINARY_CLOUD_NAME', CMS.cloudinary.cloud_name),
        api_key: env('CLOUDINARY_API_KEY', CMS.cloudinary.api_key),
        api_secret: env('CLOUDINARY_API_SECRET', CMS.cloudinary.api_secret),
      },
      actionOptions: {
        // Keep originals so admin media library can preview reliably.
        upload: {
          folder: env('CLOUDINARY_FOLDER', 'five-tech/blogs'),
        },
        uploadStream: {
          folder: env('CLOUDINARY_FOLDER', 'five-tech/blogs'),
        },
        delete: {},
      },
    },
  },
});
