# frozen_string_literal: true

require 'json'
require 'open3'
require 'pty'
require 'shellwords'
require_relative '../../lib/qni/view/ascii_circuit_parser'

ONE_QUBIT_INITIAL_STATE_COLS = {
  '|0>' => [[1]],
  '|1>' => [['X']],
  '0.6|0> + 0.8|1>' => [['Ry(1.8545904360032246)']],
  'cos(theta/2)|0> + sin(theta/2)|1>' => [['Ry(theta)']],
  'cos(θ/2)|0> + sin(θ/2)|1>' => [['Ry(theta)']]
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

def normalized_doc_string(doc_string)
  doc_string.sub(/\n+\z/, '')
end

def one_qubit_initial_cols(state)
  ONE_QUBIT_INITIAL_STATE_COLS.fetch(state) do
    raise "unsupported 1-qubit initial state: #{state}"
  end
end

def bundler_env
  env = { 'BUNDLE_GEMFILE' => File.join(PROJECT_ROOT, 'Gemfile') }
  env['BUNDLE_PATH'] = ENV.fetch('BUNDLE_PATH') if ENV.key?('BUNDLE_PATH')
  env
end

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
  stdout.sub(/\n+\z/, '')
        .gsub(/\A1(?:\.0+)?(?=\|)/, '')
        .gsub(/(?<= \+ )1(?:\.0+)?(?=\|)/, '')
        .gsub(/(?<= - )1(?:\.0+)?(?=\|)/, '')
        .gsub(/\A-1(?:\.0+)?(?=\|)/, '-')
        .gsub(/(?<= \+ )-1(?:\.0+)?(?=\|)/, '-')
end

def canonical_symbolic_notation(text)
  text.gsub('θ', 'theta')
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

Given('最初の状態ベクトルは:') do |doc_string|
  actual = {
    'qubits' => 1,
    'cols' => one_qubit_initial_cols(normalized_doc_string(doc_string))
  }
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

Given('2 qubit の初期状態が {string} である') do |state|
  col = case state
        when '|00>'
          [1, 1]
        when '|01>'
          [1, 'X']
        when '|10>'
          ['X', 1]
        when '|11>'
          %w[X X]
        else
          raise "unsupported 2-qubit initial state: #{state}"
        end
  actual = {
    'qubits' => 2,
    'cols' => [col]
  }
  write_circuit_json(@scenario_dir, actual)
end

When('次の回路を適用:') do |doc_string|
  append_ascii_circuit_json(@scenario_dir, doc_string)
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
      stdout.each { |chunk| output << chunk }
    rescue Errno::EIO
      nil
    ensure
      _, status = Process.wait2(pid)
    end
  end

  @stdout = output.gsub("\r\n", "\n")
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
  @stdout, @stderr, @status = run_qni_command(@scenario_dir, 'qni run --symbolic')
  assert_command_succeeded!(@status, @stdout, @stderr)
  assert_symbolic_state_matches!(@stdout, doc_string)
end

Then('標準出力:') do |doc_string|
  assert_stdout_matches!(@stdout, doc_string)
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

Then('{string} は PNG 画像である') do |path|
  actual_path = File.join(@scenario_dir, path)
  raise "expected file to exist: #{path}" unless File.exist?(actual_path)

  signature = File.binread(actual_path, 8)
  next if signature == "\x89PNG\r\n\x1A\n".b

  raise <<~MESSAGE
    expected file to be a PNG image: #{path}
  MESSAGE
end

Then('{string} は透過 PNG 画像である') do |path|
  actual_path = File.join(@scenario_dir, path)
  raise "expected file to exist: #{path}" unless File.exist?(actual_path)

  output, status = Open3.capture2('identify', '-format', '%[channels]', actual_path)
  raise "identify failed for: #{path}" unless status.success?

  next if output.strip.include?('a')

  raise <<~MESSAGE
    expected file to be a transparent PNG image: #{path}
    actual channels:
    #{output}
  MESSAGE
end

Then('{string} の画像サイズは {int}x{int} である') do |path, width, height|
  actual_path = File.join(@scenario_dir, path)
  raise "expected file to exist: #{path}" unless File.exist?(actual_path)

  output, status = Open3.capture2('identify', '-format', '%wx%h', actual_path)
  raise "identify failed for: #{path}" unless status.success?

  next if output.strip == "#{width}x#{height}"

  raise <<~MESSAGE
    expected image size to match: #{path}
    expected:
    #{width}x#{height}
    actual:
    #{output}
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
