# Hooks

## useAnimate

```tsx
import { useAnimate } from 'framer-motion';

function Component() {
    const [scope, animate] = useAnimate();

    async function sequence() {
        await animate(scope.current, { x: 100 });
        await animate(scope.current, { rotate: 180 });
        await animate(scope.current, { scale: 1.5 });
    }

    return (
        <div ref={scope}>
            <button onClick={sequence}>Animate</button>
            <div className="box" />
        </div>
    );
}
```

## useAnimate with Selectors

```tsx
const [scope, animate] = useAnimate();

// Animate child elements
await animate('.box', { opacity: 1 });
await animate('li', { x: 0 }, { delay: stagger(0.1) });
```

## useMotionValue

```tsx
import { useMotionValue, motion } from 'framer-motion';

function Component() {
    const x = useMotionValue(0);

    return (
        <motion.div
            style={{ x }}
            drag="x"
            onDrag={() => console.log(x.get())}
        />
    );
}
```

## Motion Value Methods

```tsx
const x = useMotionValue(0);

x.get();        // Get current value
x.set(100);     // Set value
x.jump(100);    // Set without animation

// Subscribe to changes
const unsubscribe = x.on('change', (latest) => {
    console.log(latest);
});
```

## useTransform

```tsx
import { useMotionValue, useTransform, motion } from 'framer-motion';

function Component() {
    const x = useMotionValue(0);

    // Map x from 0-200 to opacity 1-0
    const opacity = useTransform(x, [0, 200], [1, 0]);

    // Map x to rotation
    const rotate = useTransform(x, [0, 200], [0, 180]);

    // Custom transform function
    const color = useTransform(x, (value) =>
        value > 100 ? '#ff0000' : '#00ff00'
    );

    return <motion.div drag="x" style={{ x, opacity, rotate }} />;
}
```

## useSpring

```tsx
import { useSpring, motion } from 'framer-motion';

function SpringValue() {
    const x = useSpring(0, {
        stiffness: 100,
        damping: 10,
        mass: 1,
    });

    return (
        <motion.div
            style={{ x }}
            onMouseMove={(e) => x.set(e.clientX)}
        />
    );
}

// Spring from motion value
const x = useMotionValue(0);
const springX = useSpring(x);
```

## useVelocity

```tsx
import { useMotionValue, useVelocity, useTransform, motion } from 'framer-motion';

function VelocitySkew() {
    const x = useMotionValue(0);
    const xVelocity = useVelocity(x);
    const skewX = useTransform(xVelocity, [-1000, 0, 1000], [-30, 0, 30]);

    return <motion.div drag="x" style={{ x, skewX }} />;
}
```

## useScroll

```tsx
import { useScroll, useTransform, motion } from 'framer-motion';

function ScrollProgress() {
    const { scrollYProgress } = useScroll();
    const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [0, 1, 0]);

    return <motion.div style={{ opacity }} />;
}
```

## useAnimationFrame

```tsx
import { useAnimationFrame } from 'framer-motion';

function Spinner() {
    const ref = useRef(null);

    useAnimationFrame((time, delta) => {
        if (ref.current) {
            ref.current.style.transform = `rotate(${time / 10}deg)`;
        }
    });

    return <div ref={ref}>Spinning</div>;
}
```

## useInView

```tsx
import { useInView } from 'framer-motion';

function Component() {
    const ref = useRef(null);
    const isInView = useInView(ref, {
        once: true,
        amount: 0.5,
        margin: '-100px',
    });

    return (
        <div ref={ref}>
            {isInView ? 'In view!' : 'Not in view'}
        </div>
    );
}
```

## useDragControls

```tsx
import { useDragControls, motion } from 'framer-motion';

function DraggableWithHandle() {
    const controls = useDragControls();

    return (
        <>
            <div onPointerDown={(e) => controls.start(e)}>
                Drag Handle
            </div>
            <motion.div drag="x" dragControls={controls} dragListener={false}>
                Draggable Content
            </motion.div>
        </>
    );
}
```

## useReducedMotion

```tsx
import { useReducedMotion } from 'framer-motion';

function Component() {
    const shouldReduceMotion = useReducedMotion();

    return (
        <motion.div
            animate={{ x: 100 }}
            transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.5 }}
        />
    );
}
```
