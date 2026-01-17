# Scroll Animations

## useScroll Hook

```tsx
import { useScroll, motion } from 'framer-motion';

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
```

## Scroll Values

```tsx
const {
    scrollX,           // Absolute scroll position (px)
    scrollY,
    scrollXProgress,   // 0-1 progress through scrollable area
    scrollYProgress,
} = useScroll();
```

## Element-Based Scroll

```tsx
function ElementProgress() {
    const ref = useRef(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ['start end', 'end start'],
    });

    return (
        <motion.div
            ref={ref}
            style={{ opacity: scrollYProgress }}
        >
            Fades in as you scroll
        </motion.div>
    );
}
```

## Offset Options

```tsx
// [start of target, start of container]
offset: ['start end', 'end start']

// When element enters viewport (bottom)
offset: ['start end', 'start start']

// When element is centered
offset: ['start center', 'end center']

// Pixel values
offset: ['start end', '100px end']

// Percentages
offset: ['start 80%', 'end 20%']
```

## useTransform for Scroll

```tsx
import { useScroll, useTransform, motion } from 'framer-motion';

function ParallaxHero() {
    const { scrollY } = useScroll();
    const y = useTransform(scrollY, [0, 500], [0, -150]);
    const opacity = useTransform(scrollY, [0, 300], [1, 0]);
    const scale = useTransform(scrollY, [0, 300], [1, 0.8]);

    return (
        <motion.div style={{ y, opacity, scale }}>
            <h1>Parallax Hero</h1>
        </motion.div>
    );
}
```

## Scroll-Linked Reveal

```tsx
function ScrollReveal({ children }) {
    const ref = useRef(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ['start 0.9', 'start 0.5'],
    });

    const opacity = useTransform(scrollYProgress, [0, 1], [0, 1]);
    const y = useTransform(scrollYProgress, [0, 1], [50, 0]);

    return (
        <motion.div ref={ref} style={{ opacity, y }}>
            {children}
        </motion.div>
    );
}
```

## Scroll Velocity

```tsx
import { useScroll, useVelocity, useTransform, motion } from 'framer-motion';

function VelocityText() {
    const { scrollY } = useScroll();
    const scrollVelocity = useVelocity(scrollY);
    const skewX = useTransform(scrollVelocity, [-1000, 0, 1000], [-10, 0, 10]);

    return <motion.h1 style={{ skewX }}>Velocity Skew</motion.h1>;
}
```

## Sticky Parallax Section

```tsx
function StickyParallax() {
    const ref = useRef(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ['start start', 'end end'],
    });

    const backgroundY = useTransform(scrollYProgress, [0, 1], ['0%', '50%']);
    const textY = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);

    return (
        <div ref={ref} style={{ height: '200vh', position: 'relative' }}>
            <motion.div
                style={{
                    y: backgroundY,
                    position: 'sticky',
                    top: 0,
                    height: '100vh',
                }}
            >
                <motion.h1 style={{ y: textY }}>
                    Parallax Text
                </motion.h1>
            </motion.div>
        </div>
    );
}
```

## Container Scroll

```tsx
function ScrollableContainer() {
    const containerRef = useRef(null);
    const { scrollYProgress } = useScroll({
        container: containerRef,
    });

    return (
        <div ref={containerRef} style={{ overflow: 'scroll', height: 400 }}>
            <motion.div style={{ opacity: scrollYProgress }}>
                Content
            </motion.div>
        </div>
    );
}
```

## whileInView

```tsx
<motion.div
    initial={{ opacity: 0, y: 50 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.5 }}
    transition={{ duration: 0.5 }}
>
    Reveals when in view
</motion.div>
```
