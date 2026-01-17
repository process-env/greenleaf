---
name: framer-motion
description: Motion for React (formerly Framer Motion) animation library patterns including motion components, animation props, variants, gestures, transitions, layout animations, scroll animations, and hooks like useAnimate, useSpring, useScroll, and useTransform.
version: "2.0.0"
lastUpdated: "2026-01-11"
frameworkVersions:
  motion: "12.x"
---

# Motion for React

## Purpose

Comprehensive guide for implementing animations in React using Motion (formerly Framer Motion). Covers motion components, animation props, variants, gestures, transitions, layout animations, scroll-linked effects, and animation hooks.

> **Updated 2026-01-11:** Framer Motion has been rebranded to **Motion**. The recommended import is now `motion/react`. The `framer-motion` package still works but new features are in `motion`.

## When to Use This Skill

Automatically activates when working on:
- Adding animations to React components
- Implementing gesture interactions (hover, tap, drag)
- Creating page transitions
- Building scroll-linked animations
- Animating layout changes
- Using motion values and springs

---

## Quick Start

### Installation

```bash
# Recommended (new package)
npm install motion

# Legacy (still works)
npm install framer-motion
```

### Basic Animation

```tsx
// Recommended import (Motion v12+)
import { motion } from 'motion/react';

// Legacy import (still works)
// import { motion } from 'framer-motion';

function AnimatedBox() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            Hello, Motion!
        </motion.div>
    );
}
```

### Animation Checklist

- [ ] Choose animation type (simple, variants, gesture, scroll)
- [ ] Define initial and animate states
- [ ] Configure transition (duration, easing, spring)
- [ ] Add exit animations if using AnimatePresence
- [ ] Consider reduced motion preferences
- [ ] Test performance with many animated elements

---

## Motion Components

### Basic Usage

```tsx
// Any HTML element can be animated
<motion.div />
<motion.span />
<motion.button />
<motion.svg />
<motion.path />
<motion.img />

// Custom components
const MotionCard = motion(Card);
<MotionCard animate={{ scale: 1.1 }} />
```

### Animation Props

```tsx
<motion.div
    // Starting state
    initial={{ opacity: 0, scale: 0.8 }}

    // Target state
    animate={{ opacity: 1, scale: 1 }}

    // Exit state (requires AnimatePresence)
    exit={{ opacity: 0, scale: 0.8 }}

    // Transition configuration
    transition={{ duration: 0.3, ease: 'easeOut' }}

    // Gesture animations
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    whileFocus={{ borderColor: '#3b82f6' }}
    whileDrag={{ scale: 1.1 }}
    whileInView={{ opacity: 1 }}
/>
```

### Animatable Properties

```tsx
// Transform properties
<motion.div
    animate={{
        x: 100,           // translateX
        y: 50,            // translateY
        z: 0,             // translateZ
        rotate: 45,       // rotation in degrees
        rotateX: 0,
        rotateY: 180,
        rotateZ: 45,
        scale: 1.2,
        scaleX: 1,
        scaleY: 1,
        skew: 10,
        skewX: 0,
        skewY: 0,
    }}
/>

// CSS properties
<motion.div
    animate={{
        opacity: 1,
        backgroundColor: '#ff0000',
        color: '#ffffff',
        borderRadius: 20,
        boxShadow: '0 10px 20px rgba(0,0,0,0.2)',
        width: '100%',
        height: 200,
        padding: 20,
    }}
/>
```

---

## Variants

### Basic Variants

```tsx
const variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
};

function Component() {
    return (
        <motion.div
            variants={variants}
            initial="hidden"
            animate="visible"
        >
            Content
        </motion.div>
    );
}
```

### Orchestrated Children

```tsx
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.2,
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
};

function List({ items }) {
    return (
        <motion.ul
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {items.map((item) => (
                <motion.li key={item.id} variants={itemVariants}>
                    {item.name}
                </motion.li>
            ))}
        </motion.ul>
    );
}
```

### Dynamic Variants

```tsx
const variants = {
    hover: (custom: number) => ({
        scale: 1 + custom * 0.1,
        transition: { duration: 0.2 },
    }),
};

<motion.div
    custom={2}
    variants={variants}
    whileHover="hover"
/>
```

---

## Gestures

### Hover and Tap

```tsx
<motion.button
    whileHover={{ scale: 1.05, backgroundColor: '#3b82f6' }}
    whileTap={{ scale: 0.95 }}
    transition={{ type: 'spring', stiffness: 400, damping: 17 }}
>
    Click Me
</motion.button>
```

### Drag

```tsx
<motion.div
    drag              // Enable both axes
    drag="x"          // Horizontal only
    drag="y"          // Vertical only

    dragConstraints={{ left: -100, right: 100, top: -50, bottom: 50 }}
    dragElastic={0.2} // 0 = no elasticity, 1 = full elasticity
    dragMomentum={true}

    onDragStart={(event, info) => console.log('Start:', info.point)}
    onDrag={(event, info) => console.log('Dragging:', info.offset)}
    onDragEnd={(event, info) => console.log('End:', info.velocity)}

    whileDrag={{ scale: 1.1, cursor: 'grabbing' }}
>
    Drag me
</motion.div>
```

### Drag with Ref Constraints

```tsx
function DragWithinParent() {
    const constraintsRef = useRef(null);

    return (
        <motion.div ref={constraintsRef} style={{ width: 300, height: 300 }}>
            <motion.div
                drag
                dragConstraints={constraintsRef}
                style={{ width: 50, height: 50 }}
            />
        </motion.div>
    );
}
```

### Gesture Events

```tsx
<motion.div
    onHoverStart={() => console.log('Hover started')}
    onHoverEnd={() => console.log('Hover ended')}
    onTapStart={() => console.log('Tap started')}
    onTap={() => console.log('Tapped')}
    onTapCancel={() => console.log('Tap cancelled')}
    onPan={(e, info) => console.log('Pan:', info.offset)}
    onPanStart={(e, info) => console.log('Pan start')}
    onPanEnd={(e, info) => console.log('Pan end')}
/>
```

---

## Transitions

### Transition Types

```tsx
// Tween (default for most properties)
<motion.div
    animate={{ x: 100 }}
    transition={{
        type: 'tween',
        duration: 0.5,
        ease: 'easeInOut', // or [0.42, 0, 0.58, 1]
    }}
/>

// Spring (default for physical properties)
<motion.div
    animate={{ scale: 1.2 }}
    transition={{
        type: 'spring',
        stiffness: 100,   // Higher = snappier
        damping: 10,      // Higher = less oscillation
        mass: 1,          // Higher = slower
        bounce: 0.25,     // 0-1, shorthand for stiffness/damping
    }}
/>

// Inertia (for drag/scroll)
<motion.div
    transition={{
        type: 'inertia',
        velocity: 50,
        power: 0.8,
        timeConstant: 700,
    }}
/>
```

### Easing Functions

```tsx
// Built-in easings
'linear'
'easeIn' | 'easeOut' | 'easeInOut'
'circIn' | 'circOut' | 'circInOut'
'backIn' | 'backOut' | 'backInOut'
'anticipate'

// Custom cubic bezier
[0.42, 0, 0.58, 1]
```

### Keyframes

```tsx
<motion.div
    animate={{
        x: [0, 100, 50, 100],
        opacity: [0, 1, 0.5, 1],
    }}
    transition={{
        duration: 2,
        times: [0, 0.3, 0.7, 1], // Keyframe positions
        ease: 'easeInOut',
    }}
/>
```

### Per-Property Transitions

```tsx
<motion.div
    animate={{ x: 100, opacity: 1 }}
    transition={{
        x: { type: 'spring', stiffness: 100 },
        opacity: { duration: 0.2 },
    }}
/>
```

---

## AnimatePresence

### Exit Animations

```tsx
import { AnimatePresence, motion } from 'framer-motion';

function Modal({ isOpen, onClose }) {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="modal-backdrop"
                >
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className="modal-content"
                    >
                        Modal Content
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
```

### List Animations

```tsx
function AnimatedList({ items }) {
    return (
        <AnimatePresence>
            {items.map((item) => (
                <motion.li
                    key={item.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                >
                    {item.name}
                </motion.li>
            ))}
        </AnimatePresence>
    );
}
```

### Mode Control

```tsx
// Wait for exit before enter
<AnimatePresence mode="wait">
    <motion.div key={currentPage}>...</motion.div>
</AnimatePresence>

// Animate simultaneously (default)
<AnimatePresence mode="sync">...</AnimatePresence>

// Pop layout (for layout animations)
<AnimatePresence mode="popLayout">...</AnimatePresence>
```

---

## Layout Animations

### Auto Layout

```tsx
// Automatically animate layout changes
<motion.div layout>
    {isExpanded ? <FullContent /> : <Summary />}
</motion.div>

// Layout ID for shared element transitions
<motion.div layoutId="card-image">
    <img src={image} />
</motion.div>
```

### Shared Layout

```tsx
function Tabs({ tabs, activeTab }) {
    return (
        <div className="tabs">
            {tabs.map((tab) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}>
                    {tab.label}
                    {activeTab === tab.id && (
                        <motion.div
                            layoutId="active-indicator"
                            className="indicator"
                        />
                    )}
                </button>
            ))}
        </div>
    );
}
```

### Layout Options

```tsx
<motion.div
    layout              // Animate position and size
    layout="position"   // Only animate position
    layout="size"       // Only animate size

    layoutRoot          // Create new layout context
    layoutScroll        // Account for scroll position

    transition={{
        layout: { duration: 0.3 },
    }}
/>
```

---

## Hooks

### useAnimate

```tsx
import { useAnimate } from 'framer-motion';

function Component() {
    const [scope, animate] = useAnimate();

    async function handleClick() {
        await animate(scope.current, { scale: 1.2 });
        await animate(scope.current, { scale: 1 });
    }

    return (
        <div ref={scope}>
            <button onClick={handleClick}>Animate</button>
        </div>
    );
}
```

### useSpring

```tsx
import { useSpring, motion } from 'framer-motion';

function SpringValue() {
    const x = useSpring(0, { stiffness: 100, damping: 10 });

    return (
        <motion.div
            style={{ x }}
            onMouseMove={(e) => x.set(e.clientX)}
        />
    );
}
```

### useScroll

```tsx
import { useScroll, motion, useTransform } from 'framer-motion';

function ScrollProgress() {
    const { scrollYProgress } = useScroll();

    return (
        <motion.div
            style={{
                scaleX: scrollYProgress,
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                height: 4,
                background: '#3b82f6',
                transformOrigin: '0%',
            }}
        />
    );
}

// Scroll within element
function ElementScroll() {
    const ref = useRef(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ['start end', 'end start'],
    });

    return <div ref={ref}>...</div>;
}
```

### useTransform

```tsx
import { useScroll, useTransform, motion } from 'framer-motion';

function ParallaxSection() {
    const { scrollY } = useScroll();
    const y = useTransform(scrollY, [0, 500], [0, -150]);
    const opacity = useTransform(scrollY, [0, 300], [1, 0]);

    return (
        <motion.div style={{ y, opacity }}>
            Parallax Content
        </motion.div>
    );
}
```

### useMotionValue

```tsx
import { useMotionValue, useTransform, motion } from 'framer-motion';

function RotatingCard() {
    const x = useMotionValue(0);
    const rotate = useTransform(x, [-200, 200], [-30, 30]);
    const opacity = useTransform(x, [-200, 0, 200], [0.5, 1, 0.5]);

    return (
        <motion.div
            drag="x"
            style={{ x, rotate, opacity }}
            dragConstraints={{ left: -200, right: 200 }}
        />
    );
}
```

### useVelocity

```tsx
import { useMotionValue, useVelocity, useTransform, motion } from 'framer-motion';

function VelocitySkew() {
    const x = useMotionValue(0);
    const xVelocity = useVelocity(x);
    const skewX = useTransform(xVelocity, [-1000, 0, 1000], [-30, 0, 30]);

    return <motion.div drag="x" style={{ x, skewX }} />;
}
```

---

## Gotchas & Real-World Warnings

### Layout Thrashing Kills Performance

**Animating `width`/`height` triggers expensive reflows:**

```typescript
// DANGER: Every frame triggers layout recalculation
<motion.div animate={{ width: isOpen ? 300 : 100 }} />

// BETTER: Use transform (GPU-accelerated, no reflow)
<motion.div animate={{ scaleX: isOpen ? 1 : 0.33 }} />

// BEST for content: Use layout animations
<motion.div layout>
    {isOpen && <ExpandedContent />}
</motion.div>
```

### AnimatePresence Key Gotchas

**Wrong keys = broken exit animations:**

```typescript
// DANGER: Using array index as key
{items.map((item, index) => (
    <motion.li key={index} exit={{ opacity: 0 }}>  // Wrong item animates out!
        {item.name}
    </motion.li>
))}

// CORRECT: Use stable unique ID
{items.map((item) => (
    <motion.li key={item.id} exit={{ opacity: 0 }}>
        {item.name}
    </motion.li>
))}
```

### Mobile Performance Issues

**Complex animations stutter on mobile:**

| Problem | Impact | Solution |
|---------|--------|----------|
| Many animated elements | Dropped frames | Reduce count or simplify |
| Spring physics | CPU-intensive | Use tween on mobile |
| Layout animations | Expensive recalc | Limit scope with `layoutRoot` |
| Parallax effects | Scroll jank | Use `will-change` sparingly |

```typescript
// Detect and adapt
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = window.innerWidth < 768;

const transition = prefersReducedMotion || isMobile
    ? { duration: 0.15 }  // Quick and simple
    : { type: 'spring', stiffness: 300 };
```

### Bundle Size Surprises

**Motion adds ~30-50KB to your bundle:**

```typescript
// DANGER: Importing everything
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react';

// BETTER: Only import what you use
// But tree-shaking is limited - the core is still big

// CONSIDER: For simple animations, CSS is lighter
// @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
```

### Inline Objects Cause Re-renders

**Creating objects in render triggers unnecessary updates:**

```typescript
// DANGER: New object every render
<motion.div
    animate={{ x: 100, opacity: 1 }}  // New object = new animation every render
/>

// BETTER: Stable reference
const animateState = useMemo(() => ({ x: 100, opacity: 1 }), []);
<motion.div animate={animateState} />

// BEST: Use variants (designed for this)
const variants = { visible: { x: 100, opacity: 1 } };
<motion.div variants={variants} animate="visible" />
```

### Accessibility Is Often Ignored

**Animations can cause motion sickness and seizures:**

```typescript
// DANGER: No reduced motion support
<motion.div
    animate={{ rotate: 360 }}
    transition={{ repeat: Infinity, duration: 1 }}
/>

// CORRECT: Respect user preferences
import { useReducedMotion } from 'framer-motion';

function SpinningElement() {
    const shouldReduceMotion = useReducedMotion();

    return (
        <motion.div
            animate={shouldReduceMotion ? {} : { rotate: 360 }}
            transition={shouldReduceMotion ? {} : { repeat: Infinity }}
        />
    );
}
```

### What These Patterns Don't Tell You

1. **Server-side rendering** - Motion components can cause hydration mismatches; use `LazyMotion` for SSR
2. **Memory leaks** - Unmounted components with running animations can leak; cleanup properly
3. **Z-index wars** - `layout` animations can cause stacking context issues
4. **Touch vs mouse** - Gesture events behave differently on touch devices
5. **SVG limitations** - Not all SVG properties are animatable; test thoroughly
6. **Debugging** - Animation issues are hard to debug; use React DevTools Profiler

---

## Anti-Patterns to Avoid

- Animating width/height instead of scale (causes layout thrashing)
- Not using `layout` prop for layout animations
- Missing `key` prop when using AnimatePresence with lists
- Over-animating (too many simultaneous animations)
- Not considering `prefers-reduced-motion`
- Using inline objects for variants (causes re-renders)

---

## Navigation Guide

| Need to... | Read this |
|------------|-----------|
| Basic animations | [motion-components.md](resources/motion-components.md) |
| Coordinate animations | [variants.md](resources/variants.md) |
| User interactions | [gestures.md](resources/gestures.md) |
| Fine-tune timing | [transitions.md](resources/transitions.md) |
| Exit animations | [animate-presence.md](resources/animate-presence.md) |
| Layout changes | [layout-animations.md](resources/layout-animations.md) |
| Scroll effects | [scroll-animations.md](resources/scroll-animations.md) |
| Advanced control | [hooks.md](resources/hooks.md) |
| Full examples | [complete-examples.md](resources/complete-examples.md) |

---

## Resource Files

### [motion-components.md](resources/motion-components.md)
Motion component basics, animatable properties, prop reference

### [variants.md](resources/variants.md)
Variant definitions, orchestration, stagger, dynamic variants

### [gestures.md](resources/gestures.md)
Hover, tap, drag, pan, focus, viewport detection

### [transitions.md](resources/transitions.md)
Tween, spring, inertia, easing, keyframes, duration

### [animate-presence.md](resources/animate-presence.md)
Exit animations, list animations, mode control

### [layout-animations.md](resources/layout-animations.md)
Auto layout, shared element transitions, layoutId

### [scroll-animations.md](resources/scroll-animations.md)
useScroll, scroll progress, parallax, viewport triggers

### [hooks.md](resources/hooks.md)
useAnimate, useSpring, useMotionValue, useTransform, useVelocity

### [complete-examples.md](resources/complete-examples.md)
Full implementation patterns and real-world examples

---

## External Resources

- [Motion Documentation](https://motion.dev/docs)
- [Framer Motion GitHub](https://github.com/framer/motion)
- [Animation Examples](https://www.framer.com/motion/examples/)

---

**Skill Status**: COMPLETE
**Line Count**: < 500
**Progressive Disclosure**: 9 resource files
