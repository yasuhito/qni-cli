# frozen_string_literal: true

require 'json'
require 'open3'
require 'pty'
require 'shellwords'
require_relative '../../lib/qni/initial_state'
require_relative '../../lib/qni/image_inspector'
require_relative '../../lib/qni/view/ascii_circuit_parser'

ONE_QUBIT_INITIAL_STATE_COLS = {
  '|0>' => [[1]],
  '|1>' => [['X']],
  '0.6|0> + 0.8|1>' => [['Ry(1.8545904360032246)']],
  'cos(theta/2)|0> + sin(theta/2)|1>' => [['Ry(theta)']],
  'cos(θ/2)|0> + sin(θ/2)|1>' => [['Ry(theta)']]
}.freeze

TWO_QUBIT_INITIAL_STATE_COLS = {
  '|00>' => [[1, 1]],
  '|01>' => [[1, 'X']],
  '|10>' => [['X', 1]],
  '|11>' => [%w[X X]],
  '0.6|00> + 0.8|01>' => [[1, 'Ry(1.8545904360032246)']]
}.freeze

def write_circuit_json(scenario_dir, data)
  actual_path = File.join(scenario_dir, 'circuit.json')
  File.write(actual_path, "#{JSON.pretty_generate(data)}\n")
end

def write_ascii_circuit_json(scenario_dir, ascii_art)
  circuit = Qni::View::AsciiCircuitParser.new(ascii_art).parse
  write_circuit_json(scenario_dir, circuit.to_h)
end

def append_circuit_json(scenario_dir, data)
  actual = read_circuit_json(scenario_dir)
  actual_qubits = actual.fetch('qubits')
  appended_qubits = data.fetch('qubits')
  raise "qubit count mismatch: #{actual_qubits} != #{appended_qubits}" unless actual_qubits == appended_qubits

  merged = actual.merge('cols' => actual.fetch('cols') + data.fetch('cols'))
  write_circuit_json(scenario_dir, merged)
end

def append_ascii_circuit_json(scenario_dir, ascii_art)
  circuit = Qni::View::AsciiCircuitParser.new(ascii_art).parse
  append_circuit_json(scenario_dir, circuit.to_h)
end

def read_circuit_json(scenario_dir)
  actual_path = File.join(scenario_dir, 'circuit.json')
  JSON.parse(File.read(actual_path))
end

def project_file_path(path)
  File.join(PROJECT_ROOT, path)
end

def normalized_doc_string(doc_string)
  doc_string.sub(/\n+\z/, '')
end

def one_qubit_initial_cols(state)
  ONE_QUBIT_INITIAL_STATE_COLS.fetch(state) do
    raise "unsupported 1-qubit initial state: #{state}"
  end
end

def two_qubit_initial_cols(state)
  TWO_QUBIT_INITIAL_STATE_COLS.fetch(state) do
    raise "unsupported 2-qubit initial state: #{state}"
  end
end

def initial_state_vector_cols(state)
  [ONE_QUBIT_INITIAL_STATE_COLS, TWO_QUBIT_INITIAL_STATE_COLS].each do |supported_states|
    return supported_states.fetch(state) if supported_states.key?(state)
  end

  raise "unsupported initial state: #{state}"
end

def direct_initial_state(state)
  Qni::InitialState.parse(state)
rescue Qni::InitialState::Error
  nil
end

def bundler_env
  env = { 'BUNDLE_GEMFILE' => File.join(PROJECT_ROOT, 'Gemfile') }
  env['BUNDLE_PATH'] = ENV.fetch('BUNDLE_PATH') if ENV.key?('BUNDLE_PATH')
  env.merge!(@command_env) if defined?(@command_env) && @command_env
  env
end

def python_symbolic_runtime
  File.join(PROJECT_ROOT, '.python-symbolic', 'bin', 'python')
end

def image_inspector(actual_path)
  Qni::ImageInspector.new(actual_path, python_runtime: python_symbolic_runtime)
end

def animated_png_frame_count(actual_path)
  output, status = Open3.capture2(
    python_symbolic_runtime,
    '-c',
    'from PIL import Image; import sys; print(getattr(Image.open(sys.argv[1]), "n_frames", 1))',
    actual_path
  )
  raise "python frame inspection failed for: #{actual_path}" unless status.success?

  output.to_i
end

# rubocop:disable Metrics/MethodLength
def image_includes_color?(actual_path, hex_color)
  color = hex_color.delete_prefix('#')
  script = <<~PYTHON
    from PIL import Image
    import sys

    image = Image.open(sys.argv[1]).convert("RGBA")
    pixels = image.load()
    width, height = image.size
    target = tuple(int(sys.argv[2][index:index + 2], 16) for index in (0, 2, 4))
    print(any(
        pixels[x, y][:3] == target and pixels[x, y][3] > 0
        for y in range(height)
        for x in range(width)
    ))
  PYTHON
  output, status = Open3.capture2(python_symbolic_runtime, '-c', script, actual_path, color)
  raise "python color inspection failed for: #{actual_path}" unless status.success?

  output.strip == 'True'
end

def circle_notation_phase_metrics(real:, imag:)
  script = <<~PYTHON
    import importlib.util
    import json
    import math
    import sys

    import matplotlib.pyplot as plt

    spec = importlib.util.spec_from_file_location("qni_circle_notation_render", sys.argv[1])
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    fig, ax = plt.subplots(figsize=(2, 2), dpi=module.DPI)
    ax.set_axis_off()
    ax.set_xlim(-2, 2)
    ax.set_ylim(-2, 2)
    ax.set_aspect("equal")

    module.draw_basis_circle(
        ax,
        0.0,
        0.0,
        "|0>",
        complex(float(sys.argv[2]), float(sys.argv[3])),
        module.theme_config("light")
    )

    phase_lines = [line for line in ax.lines if len(line.get_xdata()) == 2 and len(line.get_ydata()) == 2]
    if phase_lines:
        line = phase_lines[0]
        xdata = list(line.get_xdata())
        ydata = list(line.get_ydata())
        needle_dx = xdata[1] - xdata[0]
        needle_dy = ydata[1] - ydata[0]
        needle_length = math.hypot(xdata[1] - xdata[0], ydata[1] - ydata[0])
        phase_visible = True
    else:
        needle_dx = 0.0
        needle_dy = 0.0
        needle_length = 0.0
        phase_visible = False

    center_dot_visible = any(
        line.get_marker() == "o" and len(line.get_xdata()) == 1 and len(line.get_ydata()) == 1
        for line in ax.lines
    )

    plt.close(fig)
    print(json.dumps({
        "outer_radius": module.OUTER_RADIUS,
        "needle_dx": needle_dx,
        "needle_dy": needle_dy,
        "needle_length": needle_length,
        "phase_visible": phase_visible,
        "center_dot_visible": center_dot_visible
    }))
  PYTHON
  helper_path = File.join(PROJECT_ROOT, 'libexec', 'qni_circle_notation_render.py')
  output, status = Open3.capture2(
    python_symbolic_runtime,
    '-c',
    script,
    helper_path,
    real.to_s,
    imag.to_s
  )
  raise 'python circle notation phase inspection failed' unless status.success?

  JSON.parse(output)
end

def circle_notation_outline_metrics
  script = <<~PYTHON
    import importlib.util
    import json
    import sys

    import matplotlib.pyplot as plt

    spec = importlib.util.spec_from_file_location("qni_circle_notation_render", sys.argv[1])
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    fig, ax = plt.subplots(figsize=(2, 2), dpi=module.DPI)
    ax.set_axis_off()
    ax.set_xlim(-2, 2)
    ax.set_ylim(-2, 2)
    ax.set_aspect("equal")
    fig.canvas.draw()

    module.draw_basis_circle(
        ax,
        0.0,
        0.0,
        "|0>",
        complex(1.0, 0.0),
        module.theme_config("light")
    )

    outer = ax.patches[0]
    linewidth_px = outer.get_linewidth() * fig.dpi / 72.0
    origin = ax.transData.transform((0.0, 0.0))
    unit_x = ax.transData.transform((1.0, 0.0))
    pixels_per_data = unit_x[0] - origin[0]
    half_linewidth_data = (linewidth_px / pixels_per_data) / 2.0

    plt.close(fig)
    print(json.dumps({
        "intended_radius": module.OUTER_RADIUS,
        "outline_radius": outer.get_radius(),
        "outline_inner_edge": outer.get_radius() - half_linewidth_data
    }))
  PYTHON
  helper_path = File.join(PROJECT_ROOT, 'libexec', 'qni_circle_notation_render.py')
  output, status = Open3.capture2(
    python_symbolic_runtime,
    '-c',
    script,
    helper_path
  )
  raise 'python circle notation outline inspection failed' unless status.success?

  JSON.parse(output)
end

def bloch_label_layout
  script = <<~PYTHON
    import importlib.util
    import json
    import sys

    spec = importlib.util.spec_from_file_location("qni_bloch_render", sys.argv[1])
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    print(json.dumps(module.label_layout()))
  PYTHON
  helper_path = File.join(PROJECT_ROOT, 'libexec', 'qni_bloch_render.py')
  output, status = Open3.capture2(python_symbolic_runtime, '-c', script, helper_path)
  raise 'python bloch label layout inspection failed' unless status.success?

  JSON.parse(output)
end

def bloch_label_metrics
  script = <<~PYTHON
    import importlib.util
    import json
    import sys

    spec = importlib.util.spec_from_file_location("qni_bloch_render", sys.argv[1])
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    print(json.dumps(module.label_metrics()))
  PYTHON
  helper_path = File.join(PROJECT_ROOT, 'libexec', 'qni_bloch_render.py')
  output, status = Open3.capture2(python_symbolic_runtime, '-c', script, helper_path)
  raise 'python bloch label metrics inspection failed' unless status.success?

  JSON.parse(output)
end
# rubocop:enable Metrics/MethodLength

def run_qni_command(scenario_dir, command)
  argv = Shellwords.split(command)
  raise "command must start with qni: #{command}" unless argv.first == 'qni'

  Open3.capture3(
    bundler_env,
    'bundle',
    'exec',
    QNI_BIN,
    *argv.drop(1),
    chdir: scenario_dir
  )
end

def assert_command_succeeded!(status, stdout, stderr)
  return if status.success?

  raise <<~MESSAGE
    expected command to succeed, but it failed
    exit status: #{status.exitstatus}
    stdout:
    #{stdout}
    stderr:
    #{stderr}
  MESSAGE
end

def assert_command_failed!(status, stdout, stderr)
  return unless status.success?

  raise <<~MESSAGE
    expected command to fail, but it succeeded
    stdout:
    #{stdout}
    stderr:
    #{stderr}
  MESSAGE
end

def assert_stdout_matches!(stdout, doc_string)
  actual = stdout.sub(/\n+\z/, '')
  return if actual == doc_string

  raise <<~MESSAGE
    expected stdout to match
    expected:
    #{doc_string}
    actual:
    #{actual}
  MESSAGE
end

def normalize_symbolic_state_vector(stdout)
  compact_unit_coefficients(stdout.sub(/\n+\z/, ''))
end

def compact_unit_coefficients(text)
  text.gsub(/\A1(?:\.0+)?(?=\|)/, '')
      .gsub(/\A1(?:\.0+)?i(?=\|)/, 'i')
      .gsub(/(?<= \+ )1(?:\.0+)?(?=\|)/, '')
      .gsub(/(?<= \+ )1(?:\.0+)?i(?=\|)/, 'i')
      .gsub(/(?<= - )1(?:\.0+)?(?=\|)/, '')
      .gsub(/(?<= - )1(?:\.0+)?i(?=\|)/, 'i')
      .gsub(/\A-1(?:\.0+)?(?=\|)/, '-')
      .gsub(/(?<= \+ )-1(?:\.0+)?(?=\|)/, '-')
      .gsub(/\A-1(?:\.0+)?i(?=\|)/, '-i')
      .gsub(/(?<= \+ )-1(?:\.0+)?i(?=\|)/, '-i')
end

def trim_trailing_decimal_zeros(text)
  text.gsub(/-?\d+\.\d+/) do |number|
    number.sub(/(\.\d*?[1-9])0+\z/, '\1')
          .sub(/\.0+\z/, '')
  end
end

def normalize_imaginary_unit(text)
  text.gsub('*I', 'i')
      .gsub(/\bI\b/, 'i')
      .gsub(/\bi\*(?=[a-zA-Z_])/, 'i')
      .gsub(/\b-i\*(?=[a-zA-Z_])/, '-i')
end

def normalize_symbolic_shorthand(text)
  text.gsub('|+>', 'sqrt(2)/2|0> + sqrt(2)/2|1>')
      .gsub('|->', 'sqrt(2)/2|0> - sqrt(2)/2|1>')
end

def normalize_symbolic_aliases(text)
  text.gsub('θ', 'theta')
      .gsub('α', 'alpha')
      .gsub('β', 'beta')
      .gsub('π', 'pi')
      .gsub('√2', 'sqrt(2)')
      .gsub(/(\d(?:\.\d+)?)(?=sqrt\(2\))/, '\1*')
end

def normalize_phase_factor_order(text)
  text.gsub(/exp\(([^)]+)\)([a-zA-Z_][a-zA-Z0-9_]*)/, '\2*exp(\1)')
end

def canonical_symbolic_notation(text)
  trim_trailing_decimal_zeros(
    normalize_phase_factor_order(
      normalize_symbolic_aliases(
        normalize_imaginary_unit(
          normalize_symbolic_shorthand(text)
        )
      )
    )
  )
end

def canonical_named_basis_notation(text)
  trim_trailing_decimal_zeros(
    text.gsub('θ', 'theta')
        .gsub('α', 'alpha')
        .gsub('β', 'beta')
        .gsub('π', 'pi')
        .gsub('√2', 'sqrt(2)')
        .gsub(/(\d(?:\.\d+)?)(?=sqrt\(2\))/, '\1*')
  )
end

def assert_symbolic_state_matches!(stdout, doc_string)
  actual = canonical_symbolic_notation(normalize_symbolic_state_vector(stdout))
  expected = canonical_symbolic_notation(doc_string)
  return if actual == expected

  raise <<~MESSAGE
    expected symbolic state vector to match
    expected:
    #{expected}
    actual:
    #{actual}
  MESSAGE
end

def assert_named_basis_state_matches!(stdout, doc_string)
  actual = canonical_named_basis_notation(normalize_symbolic_state_vector(stdout))
  expected = canonical_named_basis_notation(doc_string)
  return if actual == expected

  raise <<~MESSAGE
    expected named-basis state vector to match
    expected:
    #{expected}
    actual:
    #{actual}
  MESSAGE
end

def assert_computational_basis_state_vector!(scenario_dir, doc_string)
  stdout, stderr, status = run_qni_command(scenario_dir, 'qni run --symbolic')
  assert_command_succeeded!(status, stdout, stderr)
  assert_symbolic_state_matches!(stdout, doc_string)
end

Given('空の 1 qubit 回路がある') do
  actual = {
    'qubits' => 1,
    'cols' => [[1]]
  }
  write_circuit_json(@scenario_dir, actual)
end

Given(/^次の回路(?:図)?がある:$/) do |doc_string|
  write_ascii_circuit_json(@scenario_dir, doc_string)
end

Given('1 qubit の初期状態が {string} である') do |state|
  actual = {
    'qubits' => 1,
    'cols' => one_qubit_initial_cols(state)
  }
  write_circuit_json(@scenario_dir, actual)
end

Given('初期状態ベクトルは:') do |doc_string|
  state = normalized_doc_string(doc_string)
  initial_state = direct_initial_state(state)
  actual = if initial_state
             qubits = initial_state.qubits
             {
               'qubits' => qubits,
               'initial_state' => initial_state.to_h,
               'cols' => [Array.new(qubits, 1)]
             }
           else
             cols = initial_state_vector_cols(state)
             {
               'qubits' => cols.first.length,
               'cols' => cols
             }
           end
  write_circuit_json(@scenario_dir, actual)
end

Given('空の 2 qubit 回路がある') do
  actual = {
    'qubits' => 2,
    'cols' => [[1, 1]]
  }
  write_circuit_json(@scenario_dir, actual)
end

Given('空の 3 qubit 回路がある') do
  actual = {
    'qubits' => 3,
    'cols' => [[1, 1, 1]]
  }
  write_circuit_json(@scenario_dir, actual)
end

Given('環境変数 {string} を {string} に設定する') do |name, value|
  @command_env ||= {}
  @command_env[name] = value
end

Given('2 qubit の初期状態が {string} である') do |state|
  actual = {
    'qubits' => 2,
    'cols' => two_qubit_initial_cols(state)
  }
  write_circuit_json(@scenario_dir, actual)
end

When('次の回路を適用:') do |doc_string|
  append_ascii_circuit_json(@scenario_dir, doc_string)
end

When('次の回路を読み込もうとする:') do |doc_string|
  @parse_error = nil
  write_ascii_circuit_json(@scenario_dir, doc_string)
rescue Qni::View::AsciiCircuitParser::Error => e
  @parse_error = e.message
end

When('回路を実行') do
  @stdout, @stderr, @status = run_qni_command(@scenario_dir, 'qni run')
end

When('{string} を実行') do |command|
  @stdout, @stderr, @status = run_qni_command(@scenario_dir, command)
end

When('{string} を TTY で実行') do |command|
  argv = Shellwords.split(command)
  raise "command must start with qni: #{command}" unless argv.first == 'qni'

  output = +''
  status = nil

  Dir.chdir(@scenario_dir) do
    PTY.spawn(bundler_env, 'bundle', 'exec', QNI_BIN, *argv.drop(1)) do |stdout, _stdin, pid|
      loop { output << stdout.readpartial(4096) }
    rescue EOFError, Errno::EIO
      nil
    ensure
      _, status = Process.wait2(pid)
    end
  end

  @stdout = output.b.gsub("\r\n".b, "\n".b).force_encoding(Encoding::UTF_8)
  @stderr = ''
  @status = status
end

Then('コマンドは成功') do
  assert_command_succeeded!(@status, @stdout, @stderr)
end

Then('コマンドは失敗') do
  assert_command_failed!(@status, @stdout, @stderr)
end

Then('標準出力は空') do
  next if @stdout.empty?

  raise <<~MESSAGE
    expected stdout to be empty
    actual stdout:
    #{@stdout}
  MESSAGE
end

Then('状態ベクトルは:') do |doc_string|
  assert_computational_basis_state_vector!(@scenario_dir, doc_string)
end

Then('読み込みエラー:') do |doc_string|
  expected = normalized_doc_string(doc_string)
  actual = @parse_error

  raise 'expected ASCII parser to fail, but it succeeded' if actual.nil?
  next if actual == expected

  raise <<~MESSAGE
    expected ASCII parser error to match
    expected:
    #{expected}
    actual:
    #{actual}
  MESSAGE
end

Then('計算基底での状態ベクトルは:') do |doc_string|
  assert_computational_basis_state_vector!(@scenario_dir, doc_string)
end

Then('|+>, |-> 基底での状態ベクトルは:') do |doc_string|
  @stdout, @stderr, @status = run_qni_command(@scenario_dir, 'qni run --symbolic --basis x')
  assert_command_succeeded!(@status, @stdout, @stderr)
  assert_named_basis_state_matches!(@stdout, doc_string)
end

Then('|+i>, |-i> 基底での状態ベクトルは:') do |doc_string|
  @stdout, @stderr, @status = run_qni_command(@scenario_dir, 'qni run --symbolic --basis y')
  assert_command_succeeded!(@status, @stdout, @stderr)
  assert_named_basis_state_matches!(@stdout, doc_string)
end

Then('Bell 基底での状態ベクトルは:') do |doc_string|
  @stdout, @stderr, @status = run_qni_command(@scenario_dir, 'qni run --symbolic --basis bell')
  assert_command_succeeded!(@status, @stdout, @stderr)
  assert_named_basis_state_matches!(@stdout, doc_string)
end

Then('標準出力:') do |doc_string|
  assert_stdout_matches!(@stdout, doc_string)
end

Then('コマンドは成功して標準出力:') do |doc_string|
  assert_command_succeeded!(@status, @stdout, @stderr)
  assert_stdout_matches!(@stdout, doc_string)
end

Then('circuit.json:') do |doc_string|
  actual = read_circuit_json(@scenario_dir)
  expected = JSON.parse(doc_string)
  next if actual == expected

  raise <<~MESSAGE
    expected circuit.json to match
    expected:
    #{JSON.pretty_generate(expected)}
    actual:
    #{JSON.pretty_generate(actual)}
  MESSAGE
end

Then('回路図:') do |doc_string|
  actual = @stdout.sub(/\n+\z/, '').lines.map(&:rstrip).join("\n")
  expected = doc_string.lines.map(&:rstrip).join("\n")
  next if actual == expected

  raise <<~MESSAGE
    expected circuit view to match
    expected:
    #{expected}
    actual:
    #{actual}
  MESSAGE
end

Then('標準出力に dim 修飾付きラベル {string} を含む') do |label|
  chars = label.each_char.to_a
  raise "label must have at least 2 characters: #{label}" if chars.length < 2

  base = chars[0...-1].join
  suffix = chars.last
  expected = "#{base}\e[37;2m#{suffix}\e[0m"
  next if @stdout.include?(expected)

  raise <<~MESSAGE
    expected stdout to include dim-decorated label
    expected:
    #{expected.inspect}
    actual:
    #{@stdout.inspect}
  MESSAGE
end

Then('標準出力に次を含む:') do |doc_string|
  next if @stdout.include?(doc_string)

  raise <<~MESSAGE
    expected stdout to include
    expected:
    #{doc_string}
    actual:
    #{@stdout}
  MESSAGE
end

Then('標準出力に次を含まない:') do |doc_string|
  next unless @stdout.include?(doc_string)

  raise <<~MESSAGE
    expected stdout not to include
    unexpected:
    #{doc_string}
    actual:
    #{@stdout}
  MESSAGE
end

Then('標準出力は Kitty graphics escape sequence を含む') do
  next if @stdout.include?("\e_G")

  raise <<~MESSAGE
    expected stdout to include Kitty graphics escape sequence
    actual:
    #{@stdout.inspect}
  MESSAGE
end

Then('標準出力は {int} 個以上の Kitty graphics escape sequence を含む') do |minimum_count|
  actual_count = @stdout.scan("\e_G").length
  next if actual_count >= minimum_count

  raise <<~MESSAGE
    expected stdout to include at least #{minimum_count} Kitty graphics escape sequences
    actual:
    #{actual_count}
  MESSAGE
end

Then('標準エラー:') do |doc_string|
  actual = @stderr.delete_suffix("\n")
  next if actual == doc_string

  raise <<~MESSAGE
    expected stderr to match
    expected:
    #{doc_string}
    actual:
    #{actual}
  MESSAGE
end

Then('コマンドは失敗して標準エラー:') do |doc_string|
  assert_command_failed!(@status, @stdout, @stderr)
  actual = @stderr.delete_suffix("\n")
  next if actual == doc_string

  raise <<~MESSAGE
    expected stderr to match
    expected:
    #{doc_string}
    actual:
    #{actual}
  MESSAGE
end

Then('期待値 {string} は {float} ± 1e-{int}') do |observable, expected, exponent|
  tolerance = 10.0**(-exponent)
  actual_line = @stdout.lines.find { |line| line.start_with?("#{observable}=") }
  raise "expected observable to be present in stdout: #{observable}" unless actual_line

  actual = actual_line.delete_suffix("\n").split('=', 2).last.to_f
  next if (actual - expected).abs <= tolerance

  raise <<~MESSAGE
    expected observable #{observable} to be within tolerance
    expected: #{expected}
    tolerance: #{tolerance}
    actual: #{actual}
    stdout:
    #{@stdout}
  MESSAGE
end

Then('{string} の内容:') do |path, doc_string|
  actual_path = File.join(@scenario_dir, path)
  raise "expected file to exist: #{path}" unless File.exist?(actual_path)

  actual = JSON.parse(File.read(actual_path))
  expected = JSON.parse(doc_string)
  next if actual == expected

  raise <<~MESSAGE
    expected file content to match: #{path}
    expected:
    #{JSON.pretty_generate(expected)}
    actual:
    #{JSON.pretty_generate(actual)}
  MESSAGE
end

Then('{string} は存在しない') do |path|
  actual_path = File.join(@scenario_dir, path)
  next unless File.exist?(actual_path)

  raise <<~MESSAGE
    expected file not to exist: #{path}
  MESSAGE
end

Then('リポジトリファイル {string} は存在する') do |path|
  actual_path = project_file_path(path)
  next if File.exist?(actual_path)

  raise <<~MESSAGE
    expected repository file to exist: #{path}
  MESSAGE
end

Then('リポジトリファイル {string} は {string} を含む') do |path, text|
  actual_path = project_file_path(path)
  raise "expected repository file to exist: #{path}" unless File.exist?(actual_path)

  actual = File.read(actual_path)
  next if actual.include?(text)

  raise <<~MESSAGE
    expected repository file to include text
    file:
    #{path}
    expected:
    #{text}
  MESSAGE
end

Then('{string} は PNG 画像である') do |path|
  actual_path = File.join(@scenario_dir, path)
  raise "expected file to exist: #{path}" unless File.exist?(actual_path)

  signature = File.binread(actual_path, 8)
  next if signature == "\x89PNG\r\n\x1A\n".b

  raise <<~MESSAGE
    expected file to be a PNG image: #{path}
  MESSAGE
end

Then('{string} は GIF 画像である') do |path|
  actual_path = File.join(@scenario_dir, path)
  raise "expected file to exist: #{path}" unless File.exist?(actual_path)

  next if image_inspector(actual_path).gif?

  raise <<~MESSAGE
    expected file to be a GIF image: #{path}
  MESSAGE
end

Then('{string} は APNG 画像である') do |path|
  actual_path = File.join(@scenario_dir, path)
  raise "expected file to exist: #{path}" unless File.exist?(actual_path)

  inspector = image_inspector(actual_path)
  next if inspector.animated_png?

  raise <<~MESSAGE
    expected file to be an animated PNG image: #{path}
  MESSAGE
end

Then('{string} は {int} フレーム以上の GIF 画像である') do |path, minimum_frames|
  actual_path = File.join(@scenario_dir, path)
  raise "expected file to exist: #{path}" unless File.exist?(actual_path)

  actual_frames = image_inspector(actual_path).frame_count
  next if actual_frames >= minimum_frames

  raise <<~MESSAGE
    expected GIF frame count to be at least #{minimum_frames}: #{path}
    actual:
    #{actual_frames}
  MESSAGE
end

Then('{string} は {int} フレーム以上の APNG 画像である') do |path, minimum_frames|
  actual_path = File.join(@scenario_dir, path)
  raise "expected file to exist: #{path}" unless File.exist?(actual_path)

  actual_frames = animated_png_frame_count(actual_path)
  next if actual_frames >= minimum_frames

  raise <<~MESSAGE
    expected APNG frame count to be at least #{minimum_frames}: #{path}
    actual:
    #{actual_frames}
  MESSAGE
end

Then('{string} は透過 PNG 画像である') do |path|
  actual_path = File.join(@scenario_dir, path)
  raise "expected file to exist: #{path}" unless File.exist?(actual_path)

  next if image_inspector(actual_path).transparent_png?

  raise <<~MESSAGE
    expected file to be a transparent PNG image: #{path}
  MESSAGE
end

Then('{string} は不透過 PNG 画像である') do |path|
  actual_path = File.join(@scenario_dir, path)
  raise "expected file to exist: #{path}" unless File.exist?(actual_path)

  next if image_inspector(actual_path).png? && !image_inspector(actual_path).transparent_png?

  raise <<~MESSAGE
    expected file to be an opaque PNG image: #{path}
  MESSAGE
end

Then('{string} の画像サイズは {int}x{int} である') do |path, width, height|
  actual_path = File.join(@scenario_dir, path)
  raise "expected file to exist: #{path}" unless File.exist?(actual_path)

  actual_width, actual_height = image_inspector(actual_path).dimensions
  next if [actual_width, actual_height] == [width, height]

  raise <<~MESSAGE
    expected image size to match: #{path}
    expected:
    #{width}x#{height}
    actual:
    #{actual_width}x#{actual_height}
  MESSAGE
end

Then('{string} は色 {string} のピクセルを含む') do |path, hex_color|
  actual_path = File.join(@scenario_dir, path)
  raise "expected file to exist: #{path}" unless File.exist?(actual_path)

  next if image_includes_color?(actual_path, hex_color)

  raise <<~MESSAGE
    expected image to include color #{hex_color}: #{path}
  MESSAGE
end

Then('circle notation renderer では振幅 {float} の位相針の長さは外円の半径に等しい') do |real|
  metrics = circle_notation_phase_metrics(real: real, imag: 0.0)
  actual = metrics.fetch('needle_length')
  expected = metrics.fetch('outer_radius')
  tolerance = 0.001

  next if metrics.fetch('phase_visible') && (actual - expected).abs <= tolerance

  raise <<~MESSAGE
    expected phase needle length to equal the outer radius for nonzero amplitudes
    actual:
    #{actual}
    expected:
    #{expected}
  MESSAGE
end

Then('circle notation renderer では正の実数振幅の位相針は上を向く') do
  metrics = circle_notation_phase_metrics(real: 1.0, imag: 0.0)

  next if metrics.fetch('phase_visible') &&
          metrics.fetch('needle_dx').abs <= 0.001 &&
          metrics.fetch('needle_dy') > 0.0

  raise <<~MESSAGE
    expected positive real amplitude to point upward
    actual:
    #{metrics}
  MESSAGE
end

Then('circle notation renderer では正の虚数振幅の位相針は左を向く') do
  metrics = circle_notation_phase_metrics(real: 0.0, imag: 1.0)

  next if metrics.fetch('phase_visible') &&
          metrics.fetch('needle_dx') < 0.0 &&
          metrics.fetch('needle_dy').abs <= 0.001

  raise <<~MESSAGE
    expected positive imaginary amplitude to point leftward
    actual:
    #{metrics}
  MESSAGE
end

Then('circle notation renderer では外円の輪郭線は内側へ食い込まない') do
  metrics = circle_notation_outline_metrics
  actual = metrics.fetch('outline_inner_edge')
  expected = metrics.fetch('intended_radius')
  tolerance = 0.001

  next if actual >= expected - tolerance

  raise <<~MESSAGE
    expected outline stroke not to intrude inside the intended outer radius
    actual:
    #{actual}
    expected:
    #{expected}
  MESSAGE
end

Then('circle notation renderer では振幅 0 のとき位相針は描画されない') do
  metrics = circle_notation_phase_metrics(real: 0.0, imag: 0.0)
  next unless metrics.fetch('phase_visible')

  raise <<~MESSAGE
    expected phase needle to be hidden for zero amplitude
    actual:
    #{metrics}
  MESSAGE
end

Then('circle notation renderer では振幅 0 のとき中心ドットも描画されない') do
  metrics = circle_notation_phase_metrics(real: 0.0, imag: 0.0)
  next unless metrics.fetch('center_dot_visible')

  raise <<~MESSAGE
    expected center dot to be hidden for zero amplitude
    actual:
    #{metrics}
  MESSAGE
end

Then('ブロッホ球のラベル {string} と {string} の距離は {float} より大きい') do |first_label, second_label, minimum_distance|
  labels = bloch_label_layout.fetch('labels')
  first = labels.fetch(first_label)
  second = labels.fetch(second_label)
  distance = Math.sqrt(
    first.zip(second).sum do |lhs, rhs|
      (lhs - rhs)**2
    end
  )
  next if distance > minimum_distance

  raise <<~MESSAGE
    expected distance between #{first_label} and #{second_label} to be > #{minimum_distance}
    actual:
    #{distance}
  MESSAGE
end

Then('ブロッホ球のラベル {string} と {string} は z 軸上で上向きに並ぶ') do |lower_label, upper_label|
  labels = bloch_label_layout.fetch('labels')
  lower = labels.fetch(lower_label)
  upper = labels.fetch(upper_label)
  tolerance = 0.01

  next if lower[0].abs <= tolerance &&
          lower[1].abs <= tolerance &&
          upper[0].abs <= tolerance &&
          upper[1].abs <= tolerance &&
          upper[2] > lower[2]

  raise <<~MESSAGE
    expected #{lower_label} and #{upper_label} to align with the z axis and stack upward
    actual:
    #{lower_label}=#{lower.inspect}
    #{upper_label}=#{upper.inspect}
  MESSAGE
end

Then('ブロッホ球のラベル {string} と {string} は x 軸上で右向きに並ぶ') do |lower_label, upper_label|
  labels = bloch_label_layout.fetch('labels')
  lower = labels.fetch(lower_label)
  upper = labels.fetch(upper_label)
  tolerance = 0.01

  next if lower[1].abs <= tolerance &&
          lower[2].abs <= tolerance &&
          upper[1].abs <= tolerance &&
          upper[2].abs <= tolerance &&
          upper[0] > lower[0]

  raise <<~MESSAGE
    expected #{lower_label} and #{upper_label} to align with the x axis and stack rightward
    actual:
    #{lower_label}=#{lower.inspect}
    #{upper_label}=#{upper.inspect}
  MESSAGE
end

Then('ブロッホ球のラベル {string} の表示は z 軸の先端より上にある') do |label|
  metrics = bloch_label_metrics
  label_box = metrics.fetch('labels').fetch(label).fetch('bbox')
  axis_tip = metrics.fetch('axis_tips').fetch('z')

  next if label_box.fetch('bottom') > axis_tip.fetch('y')

  raise <<~MESSAGE
    expected #{label} to render above the z-axis tip
    actual:
    bbox=#{label_box}
    axis_tip=#{axis_tip}
  MESSAGE
end

Then('ブロッホ球のラベル {string} の表示は x 軸の先端より右にある') do |label|
  metrics = bloch_label_metrics
  label_box = metrics.fetch('labels').fetch(label).fetch('bbox')
  axis_tip = metrics.fetch('axis_tips').fetch('x')

  next if label_box.fetch('left') > axis_tip.fetch('x')

  raise <<~MESSAGE
    expected #{label} to render to the right of the x-axis tip
    actual:
    bbox=#{label_box}
    axis_tip=#{axis_tip}
  MESSAGE
end

Then('ブロッホ球のラベル {string} の表示は y 軸の先端より右にある') do |label|
  metrics = bloch_label_metrics
  label_box = metrics.fetch('labels').fetch(label).fetch('bbox')
  axis_tip = metrics.fetch('axis_tips').fetch('y')

  next if label_box.fetch('left') > axis_tip.fetch('x')

  raise <<~MESSAGE
    expected #{label} to render to the right of the y-axis tip
    actual:
    bbox=#{label_box}
    axis_tip=#{axis_tip}
  MESSAGE
end

Then('ブロッホ球のラベル {string} の表示は y 軸の先端より上にある') do |label|
  metrics = bloch_label_metrics
  label_box = metrics.fetch('labels').fetch(label).fetch('bbox')
  axis_tip = metrics.fetch('axis_tips').fetch('y')

  next if label_box.fetch('bottom') > axis_tip.fetch('y')

  raise <<~MESSAGE
    expected #{label} to render above the y-axis tip
    actual:
    bbox=#{label_box}
    axis_tip=#{axis_tip}
  MESSAGE
end

Then('ブロッホ球のラベル {string} が表示される') do |label|
  next if bloch_label_metrics.fetch('labels').key?(label)

  raise <<~MESSAGE
    expected rendered labels to include #{label}
  MESSAGE
end

Then('ブロッホ球のラベル {string} と {string} の表示領域は重ならない') do |first_label, second_label|
  metrics = bloch_label_metrics.fetch('labels')
  first = metrics.fetch(first_label).fetch('bbox')
  second = metrics.fetch(second_label).fetch('bbox')

  overlap = first.fetch('left') < second.fetch('right') &&
            first.fetch('right') > second.fetch('left') &&
            first.fetch('bottom') < second.fetch('top') &&
            first.fetch('top') > second.fetch('bottom')
  next unless overlap

  raise <<~MESSAGE
    expected rendered label boxes not to overlap
    actual:
    #{first_label}=#{first}
    #{second_label}=#{second}
  MESSAGE
end

Then('{string} と {string} は異なるファイル内容である') do |left_path, right_path|
  actual_left_path = File.join(@scenario_dir, left_path)
  actual_right_path = File.join(@scenario_dir, right_path)
  raise "expected file to exist: #{left_path}" unless File.exist?(actual_left_path)
  raise "expected file to exist: #{right_path}" unless File.exist?(actual_right_path)

  next unless File.binread(actual_left_path) == File.binread(actual_right_path)

  raise <<~MESSAGE
    expected files to differ:
    #{left_path}
    #{right_path}
  MESSAGE
end
