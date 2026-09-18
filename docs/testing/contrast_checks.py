"""Conservative colour-pair checks for the corrected light-theme surfaces.

Run with python3 docs/testing/contrast_checks.py. These calculations use the
CSS colour/opacity values; they are not a complete rendered-page WCAG audit.
For gradients, use the lightest card overlay and darkest gold background.
"""
import json


def blend(foreground, background, alpha):
    return tuple(f * alpha + b * (1 - alpha) for f, b in zip(foreground, background))


def luminance(colour):
    def linear(channel):
        value = channel / 255
        return value / 12.92 if value <= 0.04045 else ((value + 0.055) / 1.055) ** 2.4
    return sum(weight * linear(channel) for weight, channel in zip((.2126, .7152, .0722), colour))


def ratio(a, b):
    light, dark = sorted((luminance(a), luminance(b)), reverse=True)
    return (light + .05) / (dark + .05)


def checks():
    white, gold, black = (255, 255, 255), (242, 183, 5), (0, 0, 0)
    old_card = blend(white, blend((11, 13, 18), gold, .36), .09)
    new_card = blend(white, (41, 36, 26), .09)
    darkest_gold = blend(black, blend(black, gold, .16), .1)
    return [
        ('Previous menu secondary text', ratio(blend(white, old_card, .72), old_card), False),
        ('Corrected menu secondary text', ratio(blend(white, new_card, .72), new_card), True),
        ('Previous heading on gold', ratio(blend(white, gold, .94), gold), False),
        ('Corrected heading on darkest gold', ratio((23, 19, 11), darkest_gold), True),
    ]


if __name__ == '__main__':
    results = [{'pair': name, 'ratio': round(value, 2), 'current': current,
                'meets_normal_text_4_5_to_1': value >= 4.5}
               for name, value, current in checks()]
    print(json.dumps(results, indent=2))
    assert all(value >= 4.5 for _, value, current in checks() if current)
