# Nightscout Svelte Clock

This is a Svelte implementation of the Nightscout clock interface, providing a customizable blood glucose monitoring display.

## Features

- **Dynamic Clock Faces**: Support for multiple clock face configurations via URL parameters
- **Real-time Data**: Automatically fetches and displays blood glucose data from the Nightscout API
- **Customizable Display**: Configure background colors, element sizes, and layout
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Offline Detection**: Automatically handles network connectivity issues
- **Configuration Interface**: Visual tool for creating custom clock faces

## Usage

### Basic Clock Display

Navigate to `/clock/{face}` where `{face}` is a clock configuration string.

Examples:

- `/clock/clock` - Simple clock display
- `/clock/bgclock` - Blood glucose clock with data
- `/clock/bn0-sg40` - Black background, large BG value
- `/clock/cy13-sg35-dt14-nl-ar25-nl-ag6` - Full featured colorful clock

### Clock Face Parameters

Clock face strings follow this format: `{bg}{time}{stale}-{elements}`

#### Background and Time Settings (First Parameter)

- **Background**: `b` = black background, `c` = colorful background
- **Time Display**: `y` = always show reading time, `n` = conditional display
- **Stale Threshold**: Two-digit number (00-99) for staleness threshold in minutes

Examples:

- `bn13` - Black background, conditional time, 13-minute stale threshold
- `cy05` - Colorful background, always show time, 5-minute stale threshold

#### Display Elements

- `sg{size}` - Blood glucose value with specified font size
- `dt{size}` - Delta/change value with specified font size
- `ar{size}` - Direction arrow with specified size
- `ag{size}` - Age of reading with specified font size
- `time{size}` - Current time display with specified font size
- `nl` - New line (forces line break in layout)

### Configuration Tool

Use the configuration interface at `/clock/config` to:

- Visually configure clock settings
- Preview different layouts
- Generate face parameter strings
- Save/load custom configurations

### Authentication

The clock supports Nightscout authentication via:

- URL parameter: `?token=your_token`
- URL parameter: `?secret=your_secret`
- Local storage: Saved API secret hash

## API Integration

The clock fetches data from `/api/v2/properties` which should return:

```json
{
  "bgnow": {
    "sgvs": [
      {
        "sgv": 120,
        "scaled": 120,
        "direction": "Flat",
        "mills": 1234567890000,
        "datetime": "2023-01-01T12:00:00.000Z"
      }
    ]
  },
  "delta": {
    "display": "+2 mg/dL",
    "mgdl": 2
  }
}
```

## Development

### File Structure

```
frontend/src/routes/clock/
├── +layout.svelte          # Clock-specific layout (fullscreen)
├── +page.svelte            # Clock face selector
├── config/
│   └── +page.svelte        # Configuration interface
├── [face]/
│   ├── +page.svelte        # Main clock display component
│   ├── +page.server.ts     # Server-side data loading
│   └── types.ts            # TypeScript type definitions
└── lib/
    └── clock-parser.ts     # Clock face parsing logic
```

### Customization

To add new clock faces:

1. Add predefined faces to the `faceMap` in `clock-parser.ts`
2. Update the face selector in `+page.svelte`
3. Add custom CSS for face-specific styling

### Styling

The clock uses CSS custom properties from the main app theme:

- `--color-primary` - Primary theme color
- `--color-background` - Background color
- `--color-foreground` - Text color
- `--radius` - Border radius

## Browser Compatibility

- Modern browsers with ES2020+ support
- CSS Custom Properties support
- Fetch API support
- Local Storage support

## Error Handling

The clock handles:

- Network connectivity issues
- API authentication failures
- Invalid face parameters
- Missing or stale data

Errors are displayed to the user with appropriate fallback content.
