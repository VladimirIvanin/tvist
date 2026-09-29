import { getRuntime } from '../../../../src/core/runtime'
import { afterEach, describe, expect, it } from 'vitest';
import Tvist from '@core/Tvist';
import '@modules/effects';
import '@modules/loop';
import { createSliderFixture, type SliderFixture } from '../../../fixtures';

describe('Cube boundary faces', () => {
  let fixture: SliderFixture;
  let slider: Tvist;

  afterEach(() => {
    slider?.destroy();
    fixture?.cleanup();
  });

  function createCube(slidesCount: number): void {
    fixture = createSliderFixture({ slidesCount });
    slider = new Tvist(fixture.root, {
      effect: 'cube',
      loop: false,
      speed: 0,
      cubeEffect: { slideShadows: true },
    });
  }

  function getFaceAngle(slide: HTMLElement): number {
    const faceAngle = Number(slide.style.transform.match(/rotateY\(([-\d.]+)deg\)/)?.[1]);
    const cubeAngle = Number(
      slider.container.style.transform.match(/rotateY\(([-\d.]+)deg\)/)?.[1]
    );
    return ((((faceAngle + cubeAngle + 180) % 360) + 360) % 360) - 180;
  }

  it.each([2, 3, 4, 5, 6, 8])(
    'closes the face before the first of %i slides during edge drag',
    (slidesCount) => {
      createCube(slidesCount);
      slider.emit('setTranslate', slider, getRuntime(slider).engine.slideSizeValue * 0.2);

      const previousFace = slider.slides[slidesCount - 1];
      expect(previousFace.style.visibility).toBe('visible');
      expect(getFaceAngle(previousFace)).toBeCloseTo(-72);
      expect(getFaceAngle(slider.slides[0])).toBeCloseTo(18);
      expect(
        previousFace.querySelector<HTMLElement>('.tvist-v1-slide-shadow-left')?.style.opacity
      ).toBe('0.8');
      expect(slider.activeIndex).toBe(0);
      expect(slider.slideCount).toBe(slidesCount);
    }
  );

  it.each([2, 3, 4, 5, 6, 8])(
    'closes the face after the last of %i slides during edge drag',
    (slidesCount) => {
      createCube(slidesCount);
      slider.scrollTo(slidesCount - 1, true);
      slider.emit('setTranslate', slider, -getRuntime(slider).engine.slideSizeValue * (slidesCount - 1 + 0.2));

      const nextFace = slider.slides[0];
      expect(nextFace.style.visibility).toBe('visible');
      expect(getFaceAngle(nextFace)).toBeCloseTo(72);
      expect(getFaceAngle(slider.slides[slidesCount - 1])).toBeCloseTo(-18);
      expect(
        Number(nextFace.querySelector<HTMLElement>('.tvist-v1-slide-shadow-right')?.style.opacity)
      ).toBeCloseTo(0.8);
      expect(slider.activeIndex).toBe(slidesCount - 1);
      expect(slider.slideCount).toBe(slidesCount);
    }
  );

  it('keeps navigation bounded with complete cube faces', () => {
    createCube(6);
    slider.prev();
    expect(slider.activeIndex).toBe(0);

    slider.scrollTo(5, true);
    slider.next();
    expect(slider.activeIndex).toBe(5);
    expect(getFaceAngle(slider.slides[0])).toBeCloseTo(90);

    slider.scrollTo(2, true);
    expect(getFaceAngle(slider.slides[2])).toBeCloseTo(0);
    expect(getFaceAngle(slider.slides[1])).toBeCloseTo(-90);
    expect(getFaceAngle(slider.slides[3])).toBeCloseTo(90);
  });
});
