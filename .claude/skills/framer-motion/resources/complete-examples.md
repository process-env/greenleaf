# Complete Examples

## Animated Modal

```tsx
import { AnimatePresence, motion } from 'framer-motion';

const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
};

const modalVariants = {
    hidden: { opacity: 0, y: -50, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 50, scale: 0.95 },
};

function Modal({ isOpen, onClose, children }) {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="backdrop"
                    variants={backdropVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    onClick={onClose}
                >
                    <motion.div
                        className="modal"
                        variants={modalVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        transition={{ type: 'spring', damping: 25 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {children}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
```

## Staggered List

```tsx
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.1 },
    },
};

const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
};

function StaggeredList({ items }) {
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

## Interactive Card

```tsx
function InteractiveCard({ title, description }) {
    return (
        <motion.div
            className="card"
            whileHover={{ y: -5, boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        >
            <h3>{title}</h3>
            <p>{description}</p>
        </motion.div>
    );
}
```

## Expandable Card

```tsx
function ExpandableCard({ id, title, content }) {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <motion.div
            layout
            layoutId={`card-${id}`}
            onClick={() => setIsExpanded(!isExpanded)}
            className={isExpanded ? 'card-expanded' : 'card-collapsed'}
            transition={{ layout: { duration: 0.3 } }}
        >
            <motion.h3 layout="position">{title}</motion.h3>
            <AnimatePresence>
                {isExpanded && (
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        {content}
                    </motion.p>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
```

## Page Transitions

```tsx
const pageVariants = {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
};

function PageWrapper({ children }) {
    const pathname = usePathname();

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={pathname}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.3 }}
            >
                {children}
            </motion.div>
        </AnimatePresence>
    );
}
```

## Scroll Progress Bar

```tsx
function ScrollProgressBar() {
    const { scrollYProgress } = useScroll();

    return (
        <motion.div
            className="progress-bar"
            style={{
                scaleX: scrollYProgress,
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                height: 4,
                background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                transformOrigin: '0%',
                zIndex: 1000,
            }}
        />
    );
}
```

## Drag to Reorder

```tsx
import { Reorder } from 'framer-motion';

function ReorderList() {
    const [items, setItems] = useState([
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
        { id: 3, name: 'Item 3' },
    ]);

    return (
        <Reorder.Group values={items} onReorder={setItems} axis="y">
            {items.map((item) => (
                <Reorder.Item
                    key={item.id}
                    value={item}
                    whileDrag={{ scale: 1.05, boxShadow: '0 5px 20px rgba(0,0,0,0.2)' }}
                >
                    {item.name}
                </Reorder.Item>
            ))}
        </Reorder.Group>
    );
}
```

## Notification Toast

```tsx
function Toast({ message, onClose }) {
    return (
        <motion.div
            className="toast"
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        >
            <span>{message}</span>
            <button onClick={onClose}>Dismiss</button>
        </motion.div>
    );
}

function ToastContainer({ toasts, removeToast }) {
    return (
        <div className="toast-container">
            <AnimatePresence>
                {toasts.map((toast) => (
                    <Toast
                        key={toast.id}
                        message={toast.message}
                        onClose={() => removeToast(toast.id)}
                    />
                ))}
            </AnimatePresence>
        </div>
    );
}
```

## Animated Counter

```tsx
import { useSpring, useTransform, motion } from 'framer-motion';

function AnimatedCounter({ value }) {
    const spring = useSpring(value, { stiffness: 100, damping: 30 });
    const display = useTransform(spring, (current) =>
        Math.round(current).toLocaleString()
    );

    useEffect(() => {
        spring.set(value);
    }, [value, spring]);

    return <motion.span>{display}</motion.span>;
}
```
