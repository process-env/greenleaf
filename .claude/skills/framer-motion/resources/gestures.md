# Gestures

## Hover

```tsx
<motion.div
    whileHover={{ scale: 1.05, backgroundColor: '#3b82f6' }}
    onHoverStart={() => console.log('Hover started')}
    onHoverEnd={() => console.log('Hover ended')}
/>
```

## Tap / Press

```tsx
<motion.button
    whileTap={{ scale: 0.95 }}
    onTapStart={() => console.log('Tap started')}
    onTap={() => console.log('Tapped')}
    onTapCancel={() => console.log('Tap cancelled')}
/>
```

## Focus

```tsx
<motion.input
    whileFocus={{
        scale: 1.02,
        borderColor: '#3b82f6',
        boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.3)',
    }}
/>
```

## Drag

```tsx
<motion.div
    drag                    // Enable both axes
    drag="x"               // Horizontal only
    drag="y"               // Vertical only

    // Constraints
    dragConstraints={{ left: -100, right: 100, top: -50, bottom: 50 }}

    // Elasticity (0 = none, 1 = full)
    dragElastic={0.2}

    // Momentum after release
    dragMomentum={true}

    // Snap to origin
    dragSnapToOrigin={true}

    // Animation while dragging
    whileDrag={{ scale: 1.1, cursor: 'grabbing' }}

    // Events
    onDragStart={(event, info) => console.log(info.point)}
    onDrag={(event, info) => console.log(info.offset)}
    onDragEnd={(event, info) => console.log(info.velocity)}
/>
```

## Drag with Constraints Ref

```tsx
function DragInContainer() {
    const constraintsRef = useRef(null);

    return (
        <motion.div
            ref={constraintsRef}
            style={{ width: 300, height: 300, background: '#f0f0f0' }}
        >
            <motion.div
                drag
                dragConstraints={constraintsRef}
                style={{ width: 50, height: 50, background: '#3b82f6' }}
            />
        </motion.div>
    );
}
```

## Pan

```tsx
<motion.div
    onPan={(event, info) => {
        console.log('Offset:', info.offset);
        console.log('Delta:', info.delta);
        console.log('Velocity:', info.velocity);
    }}
    onPanStart={(event, info) => console.log('Pan start')}
    onPanEnd={(event, info) => console.log('Pan end')}
/>
```

## Viewport Detection

```tsx
<motion.div
    initial={{ opacity: 0 }}
    whileInView={{ opacity: 1 }}
    viewport={{
        once: true,           // Only animate once
        amount: 0.5,          // 50% visible to trigger
        margin: '-100px',     // Offset trigger point
    }}
    onViewportEnter={() => console.log('Entered viewport')}
    onViewportLeave={() => console.log('Left viewport')}
/>
```

## Gesture Info Object

```typescript
interface PanInfo {
    point: { x: number; y: number };     // Absolute position
    delta: { x: number; y: number };     // Change since last event
    offset: { x: number; y: number };    // Total offset from start
    velocity: { x: number; y: number };  // Current velocity
}
```
