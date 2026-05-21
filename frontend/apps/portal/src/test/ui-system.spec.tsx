import { describe, expect, it } from 'vitest';
import { Button, Card, Input } from '@mentrily/ui-system';
import { clickElement, render } from '@/testing';

describe('@mentrily/ui-system', () => {
  it('renders Button, Card, and Input with base styling and behavior', async () => {
    let clickCount = 0;

    const rendered = await render(
      <Card className="card-test">
        <Input className="input-test" onChange={() => undefined} value="Draft title" />
        <Button className="button-test" onClick={() => {
          clickCount += 1;
        }}>
          Save draft
        </Button>
      </Card>,
    );

    const card = rendered.container.querySelector('.card-test');
    const input = rendered.container.querySelector('.input-test');
    const button = rendered.container.querySelector('.button-test');

    expect(card?.className).toContain('rounded-3xl');
    expect(input?.className).toContain('rounded-2xl');
    expect(button?.className).toContain('rounded-xl');

    if (!(button instanceof HTMLElement)) {
      throw new Error('Expected button element to render.');
    }

    await clickElement(button);
    expect(clickCount).toBe(1);
  });
});
