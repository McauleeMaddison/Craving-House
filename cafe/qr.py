from html import escape


VERSION = 3
SIZE = 21 + (VERSION - 1) * 4
DATA_CODEWORDS = 44
ERROR_CODEWORDS = 26
REMAINDER_BITS = 7
ERROR_CORRECTION_FORMAT_BITS = 0
FORMAT_MASK = 0x5412
FORMAT_GENERATOR = 0x537


def make_qr_svg(payload):
  modules = _make_qr_modules(payload)
  quiet_zone = 4
  viewbox_size = SIZE + quiet_zone * 2
  paths = []

  for y, row in enumerate(modules):
    for x, is_dark in enumerate(row):
      if is_dark:
        paths.append(f"M{x + quiet_zone},{y + quiet_zone}h1v1h-1z")

  path_data = " ".join(paths)
  title = escape(f"Loyalty card QR code for {payload}")
  return (
    f'<svg class="loyaltyQr" viewBox="0 0 {viewbox_size} {viewbox_size}" '
    'role="img" aria-labelledby="loyalty-qr-title" '
    'xmlns="http://www.w3.org/2000/svg">'
    f'<title id="loyalty-qr-title">{title}</title>'
    '<rect width="100%" height="100%" fill="#fff"/>'
    f'<path d="{path_data}" fill="#111"/>'
    '</svg>'
  )


def _make_qr_modules(payload):
  data = _make_data_codewords(payload)
  error_correction = _reed_solomon_remainder(data, ERROR_CODEWORDS)
  bits = _codewords_to_bits(data + error_correction)
  bits.extend([False] * REMAINDER_BITS)

  base_modules, function_modules = _make_function_pattern()
  best_modules = None
  best_penalty = None

  for mask in range(8):
    modules = [row[:] for row in base_modules]
    _draw_data(modules, function_modules, bits)
    _apply_mask(modules, function_modules, mask)
    _draw_format_bits(modules, mask)
    penalty = _penalty_score(modules)
    if best_penalty is None or penalty < best_penalty:
      best_modules = modules
      best_penalty = penalty

  return best_modules


def _make_data_codewords(payload):
  payload_bytes = payload.encode("utf-8")
  if len(payload_bytes) > 40:
    raise ValueError("QR payload is too long for the loyalty card QR version.")

  bits = []
  _append_bits(bits, 0x4, 4)
  _append_bits(bits, len(payload_bytes), 8)
  for byte in payload_bytes:
    _append_bits(bits, byte, 8)

  capacity = DATA_CODEWORDS * 8
  _append_bits(bits, 0, min(4, capacity - len(bits)))
  while len(bits) % 8:
    bits.append(False)

  pad_codewords = [0xEC, 0x11]
  pad_index = 0
  while len(bits) < capacity:
    _append_bits(bits, pad_codewords[pad_index % 2], 8)
    pad_index += 1

  return [
    sum((1 << (7 - bit_index)) for bit_index, bit in enumerate(bits[offset:offset + 8]) if bit)
    for offset in range(0, len(bits), 8)
  ]


def _append_bits(bits, value, length):
  for shift in range(length - 1, -1, -1):
    bits.append(((value >> shift) & 1) == 1)


def _codewords_to_bits(codewords):
  bits = []
  for codeword in codewords:
    _append_bits(bits, codeword, 8)
  return bits


def _make_function_pattern():
  modules = [[False for _ in range(SIZE)] for _ in range(SIZE)]
  function_modules = [[False for _ in range(SIZE)] for _ in range(SIZE)]

  def set_function(x, y, is_dark):
    if 0 <= x < SIZE and 0 <= y < SIZE:
      modules[y][x] = is_dark
      function_modules[y][x] = True

  _draw_finder(set_function, 0, 0)
  _draw_finder(set_function, SIZE - 7, 0)
  _draw_finder(set_function, 0, SIZE - 7)
  _draw_alignment(set_function, SIZE - 7, SIZE - 7)

  for i in range(8, SIZE - 8):
    is_dark = i % 2 == 0
    set_function(i, 6, is_dark)
    set_function(6, i, is_dark)

  _reserve_format_modules(set_function)
  set_function(8, SIZE - 8, True)
  return modules, function_modules


def _draw_finder(set_function, left, top):
  for y in range(-1, 8):
    for x in range(-1, 8):
      xx = left + x
      yy = top + y
      if not (0 <= xx < SIZE and 0 <= yy < SIZE):
        continue
      is_dark = (
        0 <= x <= 6
        and 0 <= y <= 6
        and (x in [0, 6] or y in [0, 6] or 2 <= x <= 4 and 2 <= y <= 4)
      )
      set_function(xx, yy, is_dark)


def _draw_alignment(set_function, center_x, center_y):
  for y in range(-2, 3):
    for x in range(-2, 3):
      distance = max(abs(x), abs(y))
      set_function(center_x + x, center_y + y, distance in [0, 2])


def _reserve_format_modules(set_function):
  for i in range(15):
    if i < 6:
      set_function(8, i, False)
    elif i < 8:
      set_function(8, i + 1, False)
    else:
      set_function(8, SIZE - 15 + i, False)

    if i < 8:
      set_function(SIZE - 1 - i, 8, False)
    elif i < 9:
      set_function(7, 8, False)
    else:
      set_function(14 - i, 8, False)


def _draw_data(modules, function_modules, bits):
  bit_index = 0
  upward = True
  x = SIZE - 1

  while x > 0:
    if x == 6:
      x -= 1
    for vertical_offset in range(SIZE):
      y = SIZE - 1 - vertical_offset if upward else vertical_offset
      for dx in range(2):
        xx = x - dx
        if function_modules[y][xx]:
          continue
        modules[y][xx] = bits[bit_index] if bit_index < len(bits) else False
        bit_index += 1
    upward = not upward
    x -= 2


def _apply_mask(modules, function_modules, mask):
  for y in range(SIZE):
    for x in range(SIZE):
      if not function_modules[y][x] and _mask_bit(mask, x, y):
        modules[y][x] = not modules[y][x]


def _mask_bit(mask, x, y):
  if mask == 0:
    return (x + y) % 2 == 0
  if mask == 1:
    return y % 2 == 0
  if mask == 2:
    return x % 3 == 0
  if mask == 3:
    return (x + y) % 3 == 0
  if mask == 4:
    return (y // 2 + x // 3) % 2 == 0
  if mask == 5:
    return (x * y) % 2 + (x * y) % 3 == 0
  if mask == 6:
    return ((x * y) % 2 + (x * y) % 3) % 2 == 0
  return ((x + y) % 2 + (x * y) % 3) % 2 == 0


def _draw_format_bits(modules, mask):
  data = (ERROR_CORRECTION_FORMAT_BITS << 3) | mask
  remainder = data << 10
  for shift in range(14, 9, -1):
    if ((remainder >> shift) & 1) != 0:
      remainder ^= FORMAT_GENERATOR << (shift - 10)
  bits = ((data << 10) | remainder) ^ FORMAT_MASK

  def bit(i):
    return ((bits >> i) & 1) == 1

  for i in range(6):
    modules[i][8] = bit(i)
  modules[7][8] = bit(6)
  modules[8][8] = bit(7)
  modules[8][7] = bit(8)
  for i in range(9, 15):
    modules[8][14 - i] = bit(i)

  for i in range(8):
    modules[8][SIZE - 1 - i] = bit(i)
  for i in range(8, 15):
    modules[SIZE - 15 + i][8] = bit(i)
  modules[SIZE - 8][8] = True


def _penalty_score(modules):
  score = 0
  score += _run_penalty(modules)
  columns = [[modules[y][x] for y in range(SIZE)] for x in range(SIZE)]
  score += _run_penalty(columns)
  score += _block_penalty(modules)
  score += _finder_penalty(modules)
  score += _finder_penalty(columns)
  dark_count = sum(1 for row in modules for value in row if value)
  score += abs(dark_count * 20 - SIZE * SIZE * 10) // (SIZE * SIZE) * 10
  return score


def _run_penalty(lines):
  score = 0
  for line in lines:
    run_color = line[0]
    run_length = 1
    for color in line[1:]:
      if color == run_color:
        run_length += 1
      else:
        if run_length >= 5:
          score += 3 + run_length - 5
        run_color = color
        run_length = 1
    if run_length >= 5:
      score += 3 + run_length - 5
  return score


def _block_penalty(modules):
  score = 0
  for y in range(SIZE - 1):
    for x in range(SIZE - 1):
      color = modules[y][x]
      if modules[y][x + 1] == color and modules[y + 1][x] == color and modules[y + 1][x + 1] == color:
        score += 3
  return score


def _finder_penalty(lines):
  score = 0
  patterns = [
    [True, False, True, True, True, False, True, False, False, False, False],
    [False, False, False, False, True, False, True, True, True, False, True],
  ]
  for line in lines:
    for index in range(len(line) - 10):
      window = line[index:index + 11]
      if window in patterns:
        score += 40
  return score


def _reed_solomon_remainder(data, degree):
  generator = _reed_solomon_generator(degree)
  result = [0] * degree
  for byte in data:
    factor = byte ^ result.pop(0)
    result.append(0)
    for index, coefficient in enumerate(generator[1:]):
      result[index] ^= _gf_multiply(coefficient, factor)
  return result


def _reed_solomon_generator(degree):
  result = [1]
  for i in range(degree):
    result = _poly_multiply(result, [1, _gf_power(2, i)])
  return result


def _poly_multiply(left, right):
  result = [0] * (len(left) + len(right) - 1)
  for left_index, left_coefficient in enumerate(left):
    for right_index, right_coefficient in enumerate(right):
      result[left_index + right_index] ^= _gf_multiply(left_coefficient, right_coefficient)
  return result


def _gf_power(value, power):
  result = 1
  for _ in range(power):
    result = _gf_multiply(result, value)
  return result


def _gf_multiply(left, right):
  result = 0
  while right:
    if right & 1:
      result ^= left
    right >>= 1
    left <<= 1
    if left & 0x100:
      left ^= 0x11D
  return result
