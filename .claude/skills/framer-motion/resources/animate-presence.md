# AnimatePresence

## Basic Exit Animation

```tsx
import { AnimatePresence, motion } from 'framer-motion';

function Component({ isVisible }) {
    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    Content
                </motion.div>
            )}
        </AnimatePresence>
    );
}
```

## Modal Example

```tsx
function Modal({ isOpen, onClose }) {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                >
                    <motion.div
                        className="modal"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        Modal Content
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
```

## List Animations

```tsx
function AnimatedList({ items }) {
    return (
        <ul>
            <AnimatePresence>
                {items.map((item) => (
                    <motion.li
                        key={item.id} // Key is required!
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        layout // Smooth reordering
                    >
                        {item.name}
                    </motion.li>
                ))}
            </AnimatePresence>
        </ul>
    );
}
```

## Mode Control

```tsx
// Wait for exit before enter (page transitions)
<AnimatePresence mode="wait">
    <motion.div key={currentPage}>
        <Page />
    </motion.div>
</AnimatePresence>

// Animate simultaneously (default)
<AnimatePresence mode="sync">...</AnimatePresence>

// Pop layout (prevents layout shift)
<AnimatePresence mode="popLayout">...</AnimatePresence>
```

## Page Transitions

```tsx
// In your router layout
function Layout({ children }) {
    const pathname = usePathname();

    return (
        <AnimatePresence mode="wait">
            <motion.main
                key={pathname}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
            >
                {children}
            </motion.main>
        </AnimatePresence>
    );
}
```

## Exit Callbacks

```tsx
<AnimatePresence
    onExitComplete={() => console.log('All exits complete')}
>
    {isVisible && (
        <motion.div
            exit={{ opacity: 0 }}
            onAnimationComplete={() => console.log('Animation done')}
        >
            Content
        </motion.div>
    )}
</AnimatePresence>
```

## Initial Prop

```tsx
// Disable initial animation on first render
<AnimatePresence initial={false}>
    <motion.div
        key={id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
    />
</AnimatePresence>
```

## Custom Exit Variants

```tsx
const variants = {
    enter: { opacity: 1, x: 0 },
    exit: (direction: number) => ({
        opacity: 0,
        x: direction > 0 ? 100 : -100,
    }),
};

<AnimatePresence custom={direction}>
    <motion.div
        key={page}
        custom={direction}
        variants={variants}
        initial="exit"
        animate="enter"
        exit="exit"
    />
</AnimatePresence>
```
