# Variants

## Basic Variants

```tsx
const variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
};

<motion.div
    variants={variants}
    initial="hidden"
    animate="visible"
/>
```

## Variants with Transition

```tsx
const variants = {
    hidden: {
        opacity: 0,
        y: 20,
    },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.5,
            ease: 'easeOut',
        },
    },
};
```

## Orchestrated Children

```tsx
const container = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,    // Delay between each child
            delayChildren: 0.2,      // Delay before first child
            staggerDirection: 1,     // 1 = forward, -1 = reverse
            when: 'beforeChildren',  // or 'afterChildren'
        },
    },
};

const item = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
};

<motion.ul variants={container} initial="hidden" animate="visible">
    {items.map((i) => (
        <motion.li key={i.id} variants={item}>
            {i.name}
        </motion.li>
    ))}
</motion.ul>
```

## Dynamic Variants

```tsx
const variants = {
    hover: (isActive: boolean) => ({
        scale: isActive ? 1.2 : 1.1,
        backgroundColor: isActive ? '#22c55e' : '#3b82f6',
    }),
};

<motion.div
    custom={isActive}
    variants={variants}
    whileHover="hover"
/>
```

## Multiple States

```tsx
const variants = {
    initial: { scale: 1, opacity: 1 },
    hover: { scale: 1.05 },
    tap: { scale: 0.95 },
    disabled: { opacity: 0.5 },
};

<motion.button
    variants={variants}
    initial="initial"
    whileHover="hover"
    whileTap="tap"
    animate={isDisabled ? 'disabled' : 'initial'}
/>
```

## Variant Propagation

```tsx
// Parent controls children automatically
<motion.div animate="visible">
    {/* These inherit "visible" state */}
    <motion.span variants={childVariants} />
    <motion.span variants={childVariants} />
</motion.div>
```
