# Layout Animations

## Auto Layout

```tsx
// Automatically animate layout changes
<motion.div layout>
    {isExpanded ? <ExpandedContent /> : <CollapsedContent />}
</motion.div>

// Layout types
<motion.div layout />            // Animate position and size
<motion.div layout="position" /> // Only animate position
<motion.div layout="size" />     // Only animate size
```

## Layout Transition

```tsx
<motion.div
    layout
    transition={{
        layout: {
            duration: 0.3,
            ease: 'easeOut',
        },
    }}
/>
```

## Shared Element Transitions

```tsx
// Card in list
function CardPreview({ id, onClick }) {
    return (
        <motion.div layoutId={`card-${id}`} onClick={onClick}>
            <motion.img layoutId={`image-${id}`} src={image} />
            <motion.h2 layoutId={`title-${id}`}>{title}</motion.h2>
        </motion.div>
    );
}

// Expanded card
function CardExpanded({ id, onClose }) {
    return (
        <motion.div layoutId={`card-${id}`} onClick={onClose}>
            <motion.img layoutId={`image-${id}`} src={image} />
            <motion.h2 layoutId={`title-${id}`}>{title}</motion.h2>
            <p>Additional content...</p>
        </motion.div>
    );
}

// Usage
function App() {
    const [selectedId, setSelectedId] = useState(null);

    return (
        <>
            {cards.map((card) => (
                <CardPreview
                    key={card.id}
                    id={card.id}
                    onClick={() => setSelectedId(card.id)}
                />
            ))}

            <AnimatePresence>
                {selectedId && (
                    <CardExpanded
                        id={selectedId}
                        onClose={() => setSelectedId(null)}
                    />
                )}
            </AnimatePresence>
        </>
    );
}
```

## Tabs with Indicator

```tsx
function Tabs({ tabs, activeTab, onChange }) {
    return (
        <div className="tabs">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => onChange(tab.id)}
                    className={activeTab === tab.id ? 'active' : ''}
                >
                    {tab.label}
                    {activeTab === tab.id && (
                        <motion.div
                            layoutId="tab-indicator"
                            className="indicator"
                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                    )}
                </button>
            ))}
        </div>
    );
}
```

## Reorderable List

```tsx
import { Reorder } from 'framer-motion';

function ReorderableList({ items, setItems }) {
    return (
        <Reorder.Group values={items} onReorder={setItems}>
            {items.map((item) => (
                <Reorder.Item key={item.id} value={item}>
                    {item.name}
                </Reorder.Item>
            ))}
        </Reorder.Group>
    );
}
```

## Layout Root

```tsx
// Create isolated layout context
<motion.div layoutRoot>
    <motion.div layout>
        {/* Layout changes here won't affect outside */}
    </motion.div>
</motion.div>
```

## Layout Scroll

```tsx
// Account for scroll position in layout animations
<motion.div layoutScroll style={{ overflow: 'scroll' }}>
    <motion.div layout>Content</motion.div>
</motion.div>
```

## Avoiding Layout Flash

```tsx
// Use layoutId for smooth transitions
<AnimatePresence mode="wait">
    {isExpanded ? (
        <motion.div key="expanded" layoutId="container">
            <ExpandedView />
        </motion.div>
    ) : (
        <motion.div key="collapsed" layoutId="container">
            <CollapsedView />
        </motion.div>
    )}
</AnimatePresence>
```
