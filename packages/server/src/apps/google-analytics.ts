export default {
  id: 'google-analytics',
  name: 'Google Analytics',
  description:
    'Connect Google Analytics 4 (GA4) to track form views and submission conversion events.',
  icon: '/static/googleanalytics.png',
  settings: [
    {
      type: 'text',
      name: 'measurementId',
      label: 'Measurement ID',
      placeholder: 'e.g. G-XXXXXXXXXX',
      required: true,
      description: 'Your Google Analytics 4 Measurement ID starting with G-.'
    }
  ]
}
