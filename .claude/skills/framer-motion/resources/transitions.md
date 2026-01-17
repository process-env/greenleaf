# Transitions

## Tween (Default)

```tsx
<motion.div
    animate={{ x: 100 }}
    transition={{
        type: 'tween',
        duration: 0.5,
        ease: 'easeInOut',
        delay: 0.2,
        repeat: 2,
        repeatType: 'reverse', // 'loop' | 'reverse' | 'mirror'
        repeatDelay: 0.5,
    }}
/>
```

## Spring

```tsx
<motion.div
    animate={{ scale: 1.2 }}
    transition={{
        type: 'spring',
        stiffness: 100,   // Higher = snappier (default: 100)
        damping: 10,      // Higher = less oscillation (default: 10)
        mass: 1,          // Higher = slower (default: 1)
        velocity: 0,      // Initial velocity
    }}
/>

// Shorthand with bounce
<motion.div
    transition={{
        type: 'spring',
        bounce: 0.25,     // 0-1, replaces stiffness/damping
        duration: 0.6,
    }}
/>
```

## Inertia

```tsx
// For drag/scroll momentum
<motion.div
    drag
    transition={{
        type: 'inertia',
        velocity: 50,
        power: 0.8,
        timeConstant: 700,
        min: 0,
        max: 100,
        bounceStiffness: 500,
        bounceDamping: 10,
    }}
/>
```

## Easing Functions

```tsx
// Built-in
'linear'
'easeIn' | 'easeOut' | 'easeInOut'
'circIn' | 'circOut' | 'circInOut'
'backIn' | 'backOut' | 'backInOut'
'anticipate'

// Cubic bezier
transition={{ ease: [0.42, 0, 0.58, 1] }}

// Custom function
transition={{ ease: (t) => t * t }}
```

## Keyframes

```tsx
<motion.div
    animate={{
        x: [0, 100, 50, 100],
        rotate: [0, 90, 180, 270, 360],
    }}
    transition={{
        duration: 2,
        times: [0, 0.3, 0.6, 1],  // Positions for each keyframe
        ease: 'easeInOut',
        repeat: Infinity,
    }}
/>
```

## Per-Property Transitions

```tsx
<motion.div
    animate={{ x: 100, opacity: 1, scale: 1.2 }}
    transition={{
        duration: 0.5,
        x: { type: 'spring', stiffness: 100 },
        opacity: { duration: 0.2 },
        scale: { delay: 0.3 },
    }}
/>
```

## Default Transitions

```tsx
// Set defaults for all children
<motion.div
    transition={{ duration: 0.5, ease: 'easeOut' }}
>
    <motion.div animate={{ x: 100 }} /> {/* Inherits transition */}
</motion.div>
```

## Common Presets

```tsx
// Snappy button
{ type: 'spring', stiffness: 400, damping: 17 }

// Smooth fade
{ duration: 0.3, ease: 'easeOut' }

// Bouncy
{ type: 'spring', stiffness: 300, damping: 10 }

// Gentle
{ type: 'spring', stiffness: 50, damping: 20 }

// Quick response
{ type: 'spring', stiffness: 500, damping: 30 }
```
