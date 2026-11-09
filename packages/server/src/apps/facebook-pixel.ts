export default {
  id: 'facebook-pixel',
  name: 'Facebook Pixel',
  description:
    'Track form pageviews, visitor engagement, and conversion events for your Meta and Facebook ad campaigns.',
  icon: '/static/facebookpixel.png',
  settings: [
    {
      type: 'text',
      name: 'pixelId',
      label: 'Pixel ID',
      placeholder: 'e.g. 751374180786271',
      required: true,
      description: 'Your 15-16 digit Meta/Facebook Pixel Dataset ID from Events Manager.'
    }
  ]
}
