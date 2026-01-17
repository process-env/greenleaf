# Motion Components

## Basic Usage

```tsx
import { motion } from 'framer-motion';

// HTML elements
<motion.div />
<motion.span />
<motion.button />
<motion.a />
<motion.ul />
<motion.li />
<motion.img />

// SVG elements
<motion.svg />
<motion.path />
<motion.circle />
<motion.rect />
<motion.line />
```

## Custom Components

```tsx
import { motion } from 'framer-motion';
import { Card } from './Card';

// Wrap custom component
const MotionCard = motion(Card);

// Use it
<MotionCard animate={{ scale: 1.1 }} />

// With forwardRef
const Card = forwardRef((props, ref) => (
    <div ref={ref} {...props} />
));
const MotionCard = motion(Card);
```

## Core Props

```tsx
<motion.div
    // Initial state (on mount)
    initial={{ opacity: 0, y: 20 }}

    // Animate to this state
    animate={{ opacity: 1, y: 0 }}

    // Exit state (with AnimatePresence)
    exit={{ opacity: 0, y: -20 }}

    // Transition configuration
    transition={{ duration: 0.3 }}

    // Named variant states
    variants={variants}
/>
```

## Animatable CSS Properties

```tsx
// Transform (GPU accelerated)
{
    x: 100,           // translateX (px)
    y: 50,            // translateY (px)
    z: 0,             // translateZ (px)
    rotate: 45,       // degrees
    rotateX: 0,
    rotateY: 180,
    rotateZ: 45,
    scale: 1.2,
    scaleX: 1,
    scaleY: 1,
    skew: 10,
    skewX: 0,
    skewY: 0,
    originX: 0.5,     // transform-origin
    originY: 0.5,
    perspective: 1000,
}

// Visual
{
    opacity: 1,
    backgroundColor: '#ff0000',
    color: '#ffffff',
    borderRadius: 20,
    boxShadow: '0 10px 20px rgba(0,0,0,0.2)',
}

// Layout (use sparingly - not GPU accelerated)
{
    width: '100%',
    height: 200,
    padding: 20,
    margin: 10,
}
```

## Style Prop

```tsx
// Static + animated styles
<motion.div
    style={{
        width: 100,
        height: 100,
        backgroundColor: '#3b82f6',
    }}
    animate={{ rotate: 360 }}
/>

// With motion values
const x = useMotionValue(0);
<motion.div style={{ x }} />
```
