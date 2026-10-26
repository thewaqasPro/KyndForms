export const LogoIcon = (props: any) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <defs>
      <linearGradient
        id="kynd-icon-stem"
        x1="20"
        y1="10"
        x2="20"
        y2="90"
        gradientUnits="userSpaceOnUse"
      >
        <stop offset="0%" stopColor="#38BDF8" />
        <stop offset="100%" stopColor="#1D4ED8" />
      </linearGradient>
      <linearGradient
        id="kynd-icon-top"
        x1="36"
        y1="48"
        x2="84"
        y2="14"
        gradientUnits="userSpaceOnUse"
      >
        <stop offset="0%" stopColor="#60A5FA" />
        <stop offset="100%" stopColor="#2563EB" />
      </linearGradient>
      <linearGradient
        id="kynd-icon-bottom"
        x1="40"
        y1="46"
        x2="88"
        y2="88"
        gradientUnits="userSpaceOnUse"
      >
        <stop offset="0%" stopColor="#2563EB" />
        <stop offset="100%" stopColor="#0284C7" />
      </linearGradient>
    </defs>
    <rect x="14" y="10" width="16" height="80" rx="8" fill="url(#kynd-icon-stem)" />
    <path
      d="M40 47C37.2386 47 35 44.7614 35 42C35 40.8522 35.3941 39.7967 36.0567 38.9612L65.5161 14.2882C67.7289 12.4346 71.0259 12.6983 72.8795 14.9111C74.7331 17.1239 74.4694 20.4209 72.2566 22.2745L48.2435 42.3853L73.1895 72.483C75.0974 74.785 74.7925 78.1633 72.5085 80.0886C70.2246 82.0139 66.8285 81.7616 64.9032 79.4597L39.043 48.2562C39.6464 47.8863 40 47.4727 40 47Z"
      fill="url(#kynd-icon-top)"
    />
    <path
      d="M48 50L75.3283 82.1979C77.2917 84.5111 76.9932 87.9733 74.6617 89.9213C72.3302 91.8693 68.8407 91.573 66.8773 89.2598L38.4526 55.77C36.4892 53.4568 36.7877 49.9946 39.1192 48.0466C41.4507 46.0986 44.9402 46.3949 46.9036 48.7081L48 50Z"
      fill="url(#kynd-icon-bottom)"
    />
    <circle cx="43" cy="49" r="6.5" fill="#93C5FD" />
  </svg>
)
