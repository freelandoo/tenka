import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Observer } from 'gsap/Observer';
import { useHeroSlides } from '../../hooks/useHeroSlides';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useViewport } from '../../hooks/useViewport';
import { getCardRole, getRoleVars, toTweenVars } from '../../utils/heroRoles';
import { isRenderableImageUrl } from '../../utils/imageValidation';
import { splitHeadline } from '../../utils/format';
import HeroHeader from './HeroHeader';
import HeroShowroom from './HeroShowroom';
import HeroContent from './HeroContent';
import HeroNavigation from './HeroNavigation';
import HeroProgress from './HeroProgress';
import MobileMenu from './MobileMenu';
import SmartLink from '../SmartLink';

gsap.registerPlugin(useGSAP, Observer);

const AUTOPLAY_DELAY = 7000;
const TRANSITION_DURATION = 0.9;
const TRANSITION_EASE = 'power3.inOut';

const GRAIN_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`;
const GRAIN_URL = `url("data:image/svg+xml,${encodeURIComponent(GRAIN_SVG)}")`;

type Direction = 'next' | 'previous';
type NavigationSource = 'user' | 'wheel' | 'autoplay';

export default function TenkaHero() {
  const { slides: storedSlides, status } = useHeroSlides();

  const slides = useMemo(
    () =>
      storedSlides
        .filter((slide) => slide.isActive)
        .sort((a, b) => a.order - b.order),
    [storedSlides],
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isMobile = useViewport(768);
  const prefersReducedMotion = useReducedMotion();

  const containerRef = useRef<HTMLElement | null>(null);
  const cardRefs = useRef(new Map<string, HTMLDivElement>());
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const progressTweenRef = useRef<gsap.core.Tween | null>(null);
  const isAnimatingRef = useRef(false);
  const activeIndexRef = useRef(0);
  const isMobileRef = useRef(isMobile);
  const reducedMotionRef = useRef(prefersReducedMotion);
  const hoverPausedRef = useRef(false);
  const hasEnteredRef = useRef(false);
  const lastNavStartRef = useRef(0);

  isMobileRef.current = isMobile;
  reducedMotionRef.current = prefersReducedMotion;

  const total = slides.length;
  const activeSlide = slides[activeIndex] ?? slides[0];
  const q = gsap.utils.selector(containerRef);

  // Keep the active index valid if the admin deactivates slides.
  useEffect(() => {
    if (total > 0 && activeIndex >= total) {
      setActiveIndex(0);
      activeIndexRef.current = 0;
    }
  }, [total, activeIndex]);

  // Preload real screenshots only — never the null placeholders.
  useEffect(() => {
    slides.forEach((slide) => {
      if (isRenderableImageUrl(slide.imageUrl)) {
        const image = new Image();
        image.src = slide.imageUrl;
      }
    });
  }, [slides]);

  const registerCard = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) cardRefs.current.set(id, el);
    else cardRefs.current.delete(id);
  }, []);

  const { contextSafe } = useGSAP(
    () => {
      if (total === 0 || !containerRef.current) return;

      // Place every card in its showroom slot before paint.
      slides.forEach((slide, index) => {
        const el = cardRefs.current.get(slide.id);
        if (!el) return;
        const role = getCardRole(index, activeIndexRef.current, total);
        gsap.set(el, toTweenVars(getRoleVars(role, isMobile)));
        gsap.set(el, { zIndex: getRoleVars(role, isMobile).zIndex });
      });

      const current = slides[activeIndexRef.current] ?? slides[0];
      gsap.set(containerRef.current, { backgroundColor: current.backgroundColor });
      gsap.set(q('[data-hero-glow]'), { backgroundColor: current.accentColor });
      gsap.set(q('[data-hero-headline]'), { opacity: isMobile ? 0.75 : 0.92 });

      if (!hasEnteredRef.current) {
        hasEnteredRef.current = true;
        playEntrance();
      }
    },
    { scope: containerRef, dependencies: [total, isMobile, status] },
  );

  /* ------------------------------------------------------------------ */
  /* Autoplay                                                            */
  /* ------------------------------------------------------------------ */

  const startAutoplay = contextSafe(() => {
    progressTweenRef.current?.kill();
    const bar = q('[data-hero-progressbar]')[0];
    if (!bar) return;
    if (reducedMotionRef.current || total < 2) {
      gsap.set(bar, { scaleX: 0 });
      return;
    }
    progressTweenRef.current = gsap.fromTo(
      bar,
      { scaleX: 0 },
      {
        scaleX: 1,
        duration: AUTOPLAY_DELAY / 1000,
        ease: 'none',
        onComplete: () => navigate('next', 'autoplay'),
      },
    );
    if (hoverPausedRef.current || document.hidden) {
      progressTweenRef.current.pause();
    }
  });

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden) progressTweenRef.current?.pause();
      else if (!hoverPausedRef.current) progressTweenRef.current?.resume();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  /* ------------------------------------------------------------------ */
  /* Entrance                                                            */
  /* ------------------------------------------------------------------ */

  const playEntrance = contextSafe(() => {
    if (reducedMotionRef.current) {
      const tl = gsap.timeline({ onComplete: startAutoplay });
      timelineRef.current = tl;
      tl.fromTo(
        containerRef.current,
        { autoAlpha: 0 },
        { autoAlpha: 1, duration: 0.4, ease: 'none' },
      );
      return;
    }

    const current = activeIndexRef.current;
    const centerEl = cardRefs.current.get(slides[current]?.id ?? '');
    const prevEl = cardRefs.current.get(slides[(current - 1 + total) % total]?.id ?? '');
    const nextEl = cardRefs.current.get(slides[(current + 1) % total]?.id ?? '');

    const tl = gsap.timeline({
      defaults: { ease: 'power3.out' },
      onComplete: startAutoplay,
    });
    timelineRef.current = tl;

    tl.from(q('[data-hero-logo]'), { y: -28, autoAlpha: 0, duration: 0.7 }, 0.05)
      .from(
        q('[data-hero-headline]'),
        { yPercent: 24, autoAlpha: 0, duration: 0.9 },
        0.1,
      );

    if (centerEl) {
      tl.from(centerEl, { scale: 0.86, autoAlpha: 0, duration: 1 }, 0.15);
    }
    if (prevEl && prevEl !== centerEl) {
      tl.from(prevEl, { x: -320, autoAlpha: 0, duration: 0.9 }, 0.3);
    }
    if (nextEl && nextEl !== centerEl && nextEl !== prevEl) {
      tl.from(nextEl, { x: 320, autoAlpha: 0, duration: 0.9 }, 0.3);
    }

    tl.from(
      q('[data-hero-eyebrow], [data-hero-description]'),
      { y: 26, autoAlpha: 0, duration: 0.6, stagger: 0.08 },
      0.5,
    )
      .from(q('[data-hero-cta]'), { x: 36, autoAlpha: 0, duration: 0.6 }, 0.6)
      .from(
        q('[data-hero-arrows], [data-hero-counter]'),
        { y: 16, autoAlpha: 0, duration: 0.5 },
        0.62,
      )
      .from(
        q('[data-hero-indicator]'),
        { x: 18, autoAlpha: 0, duration: 0.5, stagger: 0.06 },
        0.68,
      );
  });

  /* ------------------------------------------------------------------ */
  /* Navigation + transition choreography                                */
  /* ------------------------------------------------------------------ */

  const runTransition = (from: number, to: number, direction: Direction) => {
    const toSlide = slides[to];
    if (!toSlide) return;

    // Kill any conflicting timeline (including a still-running entrance)
    // and clear entrance-only targets so nothing is frozen half-faded.
    if (timelineRef.current) {
      timelineRef.current.kill();
      timelineRef.current = null;
      gsap.set(q('[data-hero-logo], [data-hero-indicator], [data-hero-arrows]'), {
        clearProps: 'opacity,visibility,transform',
      });
    }
    progressTweenRef.current?.kill();
    const bar = q('[data-hero-progressbar]')[0];
    if (bar) gsap.set(bar, { scaleX: 0 });

    isAnimatingRef.current = true;
    setIsAnimating(true);
    lastNavStartRef.current = performance.now();

    const mobile = isMobileRef.current;
    const centerVars = getRoleVars('center', mobile);
    const prevVars = getRoleVars('previous', mobile);
    const nextVars = getRoleVars('next', mobile);
    const headlineOpacity = mobile ? 0.75 : 0.92;

    const prevIndex = (from - 1 + total) % total;
    const nextIndex = (from + 1) % total;
    const centerEl = cardRefs.current.get(slides[from]?.id ?? '');
    const prevEl = cardRefs.current.get(slides[prevIndex]?.id ?? '');
    const nextEl = cardRefs.current.get(slides[nextIndex]?.id ?? '');

    const headlineEl = q('[data-hero-headline]');
    const copyEls = q('[data-hero-eyebrow], [data-hero-description]');
    const ctaEls = q('[data-hero-cta]');
    const counterEl = q('[data-hero-counter-current]');
    const glowEl = q('[data-hero-glow]');

    const commitIndex = () => {
      activeIndexRef.current = to;
      setActiveIndex(to);
    };

    const animatedCards = [centerEl, prevEl, nextEl].filter(
      (el, index, list): el is HTMLDivElement =>
        Boolean(el) && list.indexOf(el) === index,
    );

    const release = () => {
      gsap.set(animatedCards, { willChange: 'auto' });
      isAnimatingRef.current = false;
      setIsAnimating(false);
      startAutoplay();
    };

    // Reduced motion: fast crossfade, no blur, no 3D rotation.
    if (reducedMotionRef.current) {
      const fadeEls = q('[data-hero-fade]');
      const tl = gsap.timeline({ onComplete: release });
      timelineRef.current = tl;
      tl.to(fadeEls, { autoAlpha: 0, duration: 0.18, ease: 'none', overwrite: 'auto' })
        .add(commitIndex)
        .add(() => {
          slides.forEach((slide, index) => {
            const el = cardRefs.current.get(slide.id);
            if (!el) return;
            const role = getCardRole(index, to, total);
            const vars = getRoleVars(role, mobile);
            gsap.set(el, {
              ...toTweenVars(vars),
              rotationY: 0,
              rotationZ: 0,
              filter: 'blur(0px)',
            });
            gsap.set(el, { zIndex: vars.zIndex });
          });
          if (containerRef.current) {
            gsap.set(containerRef.current, {
              backgroundColor: toSlide.backgroundColor,
            });
          }
          gsap.set(glowEl, { backgroundColor: toSlide.accentColor });
        })
        .to(fadeEls, { autoAlpha: 1, duration: 0.22, ease: 'none' });
      return;
    }

    gsap.set(animatedCards, { willChange: 'transform, opacity, filter' });

    const tl = gsap.timeline({
      defaults: { duration: TRANSITION_DURATION, ease: TRANSITION_EASE },
      onComplete: release,
    });
    timelineRef.current = tl;

    if (direction === 'next') {
      // Phase 1 — current center pushes slightly forward, then exits left.
      if (centerEl) {
        tl.to(centerEl, { scale: 1.04, duration: 0.16, ease: 'power2.out', overwrite: 'auto' }, 0)
          .set(centerEl, { zIndex: 18 }, 0.2)
          .to(centerEl, { ...toTweenVars(prevVars), duration: TRANSITION_DURATION - 0.16 }, 0.16)
          .set(centerEl, { zIndex: prevVars.zIndex }, TRANSITION_DURATION);
      }
      // Phase 2 — next card advances to the front.
      if (nextEl) {
        tl.set(nextEl, { zIndex: centerVars.zIndex }, 0).to(
          nextEl,
          { ...toTweenVars(centerVars), overwrite: 'auto' },
          0,
        );
      }
      // Phase 3 — previous card travels behind the stage to the next slot.
      if (prevEl && total > 2 && prevEl !== centerEl && prevEl !== nextEl) {
        tl.set(prevEl, { zIndex: 6 }, 0)
          .to(
            prevEl,
            {
              left: nextVars.left,
              top: nextVars.top,
              rotationY: nextVars.rotationY,
              rotationZ: nextVars.rotationZ,
              filter: nextVars.filter,
              x: 0,
              y: 0,
              duration: TRANSITION_DURATION,
              overwrite: 'auto',
            },
            0,
          )
          .to(prevEl, { scale: 0.44, opacity: 0.32, duration: TRANSITION_DURATION / 2, ease: 'power2.in' }, 0)
          .to(
            prevEl,
            { scale: nextVars.scale, opacity: nextVars.opacity, duration: TRANSITION_DURATION / 2, ease: 'power2.out' },
            TRANSITION_DURATION / 2,
          )
          .set(prevEl, { zIndex: nextVars.zIndex }, TRANSITION_DURATION);
      }
    } else {
      // Mirror choreography: center exits right, previous advances,
      // next travels behind to the previous slot.
      if (centerEl) {
        tl.to(centerEl, { scale: 1.04, duration: 0.16, ease: 'power2.out', overwrite: 'auto' }, 0)
          .set(centerEl, { zIndex: 18 }, 0.2)
          .to(centerEl, { ...toTweenVars(nextVars), duration: TRANSITION_DURATION - 0.16 }, 0.16)
          .set(centerEl, { zIndex: nextVars.zIndex }, TRANSITION_DURATION);
      }
      if (prevEl) {
        tl.set(prevEl, { zIndex: centerVars.zIndex }, 0).to(
          prevEl,
          { ...toTweenVars(centerVars), overwrite: 'auto' },
          0,
        );
      }
      if (nextEl && total > 2 && nextEl !== centerEl && nextEl !== prevEl) {
        tl.set(nextEl, { zIndex: 6 }, 0)
          .to(
            nextEl,
            {
              left: prevVars.left,
              top: prevVars.top,
              rotationY: prevVars.rotationY,
              rotationZ: prevVars.rotationZ,
              filter: prevVars.filter,
              x: 0,
              y: 0,
              duration: TRANSITION_DURATION,
              overwrite: 'auto',
            },
            0,
          )
          .to(nextEl, { scale: 0.44, opacity: 0.32, duration: TRANSITION_DURATION / 2, ease: 'power2.in' }, 0)
          .to(
            nextEl,
            { scale: prevVars.scale, opacity: prevVars.opacity, duration: TRANSITION_DURATION / 2, ease: 'power2.out' },
            TRANSITION_DURATION / 2,
          )
          .set(nextEl, { zIndex: prevVars.zIndex }, TRANSITION_DURATION);
      }
    }

    // Environment + copy run on the same timeline so everything is coordinated.
    tl.to(containerRef.current, { backgroundColor: toSlide.backgroundColor, overwrite: 'auto' }, 0)
      .to(glowEl, { backgroundColor: toSlide.accentColor, overwrite: 'auto' }, 0)
      .to(
        headlineEl,
        { yPercent: -22, opacity: 0, letterSpacing: '0.02em', filter: 'blur(6px)', duration: 0.34, ease: 'power2.in', overwrite: 'auto' },
        0,
      )
      .to(copyEls, { y: -18, autoAlpha: 0, duration: 0.3, ease: 'power2.in', stagger: 0.04, overwrite: 'auto' }, 0)
      .to(ctaEls, { x: 26, autoAlpha: 0, duration: 0.3, ease: 'power2.in', overwrite: 'auto' }, 0)
      .to(counterEl, { y: -10, autoAlpha: 0, duration: 0.25, ease: 'power2.in', overwrite: 'auto' }, 0)
      .call(commitIndex, [], 0.36)
      .fromTo(
        headlineEl,
        { yPercent: 26, opacity: 0, filter: 'blur(10px)', letterSpacing: '0.08em' },
        { yPercent: 0, opacity: headlineOpacity, filter: 'blur(0px)', letterSpacing: '-0.035em', duration: 0.58, ease: 'power3.out' },
        0.4,
      )
      .fromTo(
        copyEls,
        { y: 26, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.52, ease: 'power3.out', stagger: 0.06 },
        0.46,
      )
      .fromTo(
        ctaEls,
        { x: 34, autoAlpha: 0 },
        { x: 0, autoAlpha: 1, duration: 0.5, ease: 'power3.out' },
        0.52,
      )
      .fromTo(
        counterEl,
        { y: 12, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.4, ease: 'power3.out' },
        0.5,
      );
  };

  const navigate = contextSafe(
    (direction: Direction, source: NavigationSource = 'user') => {
      if (total < 2 || isAnimatingRef.current) return;
      // Wheel momentum keeps emitting events after a transition finishes;
      // require a short settle window before the wheel can navigate again.
      if (
        source === 'wheel' &&
        performance.now() - lastNavStartRef.current <
          TRANSITION_DURATION * 1000 + 300
      ) {
        return;
      }
      const from = activeIndexRef.current;
      const to =
        direction === 'next' ? (from + 1) % total : (from - 1 + total) % total;
      runTransition(from, to, direction);
    },
  );

  const goToIndex = contextSafe((index: number) => {
    const from = activeIndexRef.current;
    if (index === from || index < 0 || index >= total) return;
    if (isAnimatingRef.current) return;
    const forwardSteps = (index - from + total) % total;
    const backwardSteps = (from - index + total) % total;
    navigate(forwardSteps <= backwardSteps ? 'next' : 'previous');
  });

  // Keep stable references for handlers registered once (Observer, keyboard).
  const navigateRef = useRef(navigate);
  const goToIndexRef = useRef(goToIndex);
  navigateRef.current = navigate;
  goToIndexRef.current = goToIndex;

  /* ------------------------------------------------------------------ */
  /* Gestures: wheel, touch swipe, pointer drag                          */
  /* ------------------------------------------------------------------ */

  useGSAP(
    () => {
      if (!containerRef.current || total < 2) return;

      const wheelObserver = Observer.create({
        target: containerRef.current,
        type: 'wheel',
        preventDefault: true,
        onChangeY: (self) => {
          if (Math.abs(self.deltaY) < 8) return;
          navigateRef.current(self.deltaY > 0 ? 'next' : 'previous', 'wheel');
        },
      });

      const gestureObserver = Observer.create({
        target: containerRef.current,
        type: 'touch,pointer',
        tolerance: 24,
        lockAxis: true,
        onLeft: () => navigateRef.current('next'),
        onRight: () => navigateRef.current('previous'),
      });

      return () => {
        wheelObserver.kill();
        gestureObserver.kill();
      };
    },
    { scope: containerRef, dependencies: [total] },
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isMenuOpen) return;
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        navigateRef.current('next');
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        navigateRef.current('previous');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isMenuOpen]);

  /* ------------------------------------------------------------------ */
  /* Render                                                              */
  /* ------------------------------------------------------------------ */

  if (status === 'loading' || !activeSlide) {
    return (
      <section
        aria-label="Carregando"
        className="relative min-h-[100svh] w-full"
        style={{ backgroundColor: '#F15A24' }}
      />
    );
  }

  return (
    <section
      ref={containerRef}
      aria-label="Divisões da TENKA"
      className="relative min-h-[100svh] w-full select-none overflow-hidden font-sans text-white"
      style={{ backgroundColor: slides[0].backgroundColor }}
      onPointerEnter={(event) => {
        if (event.pointerType !== 'mouse') return;
        hoverPausedRef.current = true;
        progressTweenRef.current?.pause();
      }}
      onPointerLeave={(event) => {
        if (event.pointerType !== 'mouse') return;
        hoverPausedRef.current = false;
        if (!document.hidden) progressTweenRef.current?.resume();
      }}
    >
      {/* Grain texture */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[5] opacity-[0.06]"
        style={{ backgroundImage: GRAIN_URL, backgroundSize: '160px 160px' }}
      />

      {/* Radial glow behind the active screenshot */}
      <div
        data-hero-glow
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[56%] z-[6] h-[55vh] w-[72vw] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40 blur-[140px]"
        style={{ backgroundColor: slides[0].accentColor }}
      />

      <HeroHeader
        slides={slides}
        activeIndex={activeIndex}
        activeSlide={activeSlide}
        isAnimating={isAnimating}
        onSelectDivision={(index) => goToIndexRef.current(index)}
        onOpenMenu={() => setIsMenuOpen(true)}
      />

      {/* Giant background headline */}
      <div
        data-hero-fade
        className="pointer-events-none absolute left-1/2 top-[10%] z-[10] w-full -translate-x-1/2 select-none"
      >
        <h1
          data-hero-headline
          className="font-display text-center uppercase"
          style={{
            fontSize: 'clamp(40px, 5.5vw, 80px)',
            lineHeight: 0.82,
            letterSpacing: '-0.035em',
            whiteSpace: 'pre-line',
            opacity: isMobile ? 0.75 : 0.92,
            color: activeSlide.textColor,
          }}
        >
          {splitHeadline(activeSlide.headline)}
        </h1>
      </div>

      <HeroShowroom
        slides={slides}
        activeIndex={activeIndex}
        isAnimating={isAnimating}
        registerCard={registerCard}
        onCardClick={(index) => goToIndexRef.current(index)}
      />

      <HeroContent
        slide={activeSlide}
        index={activeIndex}
        total={total}
        isAnimating={isAnimating}
        onPrevious={() => navigateRef.current('previous')}
        onNext={() => navigateRef.current('next')}
      />

      {/* Bottom-right CTA (desktop) */}
      <div
        data-hero-fade
        className="absolute bottom-10 right-8 z-[60] hidden md:block lg:bottom-16 lg:right-14"
      >
        <SmartLink data-hero-cta to={activeSlide.ctaHref} className="group block text-white">
          <span className="flex items-center gap-4">
            <span
              className="font-display uppercase leading-none"
              style={{ fontSize: 'clamp(24px, 3.5vw, 54px)' }}
            >
              {activeSlide.ctaLabel}
            </span>
            <ArrowRight
              aria-hidden="true"
              className="h-8 w-8 shrink-0 transition-transform duration-300 group-hover:translate-x-2"
              strokeWidth={2.5}
            />
          </span>
          <span
            aria-hidden="true"
            className="mt-2 block h-[3px] w-full origin-left scale-x-[0.22] transition-transform duration-500 group-hover:scale-x-100"
            style={{ backgroundColor: activeSlide.accentColor }}
          />
        </SmartLink>
      </div>

      <HeroNavigation
        slides={slides}
        activeIndex={activeIndex}
        isAnimating={isAnimating}
        accentColor={activeSlide.accentColor}
        onSelect={(index) => goToIndexRef.current(index)}
      />

      <HeroProgress />

      {/* Screen-reader announcement of the current division */}
      <p aria-live="polite" className="sr-only">
        {`Divisão ativa: ${activeSlide.navLabel}`}
      </p>

      {isMenuOpen && (
        <MobileMenu
          slides={slides}
          accentColor={activeSlide.accentColor}
          onClose={() => setIsMenuOpen(false)}
        />
      )}
    </section>
  );
}
