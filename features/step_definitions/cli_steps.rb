# frozen_string_literal: true

require 'json'

前提('空の 1 qubit 回路がある') do
  actual_path = File.join(@scenario_dir, 'circuit.json')
  actual = {
    'qubits' => 1,
    'cols' => [[1]]
  }
  File.write(actual_path, "#{JSON.pretty_generate(actual)}\n")
end

前提('空の 2 qubit 回路がある') do
  actual_path = File.join(@scenario_dir, 'circuit.json')
  actual = {
    'qubits' => 2,
    'cols' => [[1, 1]]
  }
  File.write(actual_path, "#{JSON.pretty_generate(actual)}\n")
end

前提('2 qubit の初期状態が {string} である') do |state|
  actual_path = File.join(@scenario_dir, 'circuit.json')
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
  File.write(actual_path, "#{JSON.pretty_generate(actual)}\n")
end

もし('{string} を実行') do |command|
  argv = Shellwords.split(command)
  raise "command must start with qni: #{command}" unless argv.first == 'qni'

  @stdout, @stderr, @status = Open3.capture3(
    { 'BUNDLE_GEMFILE' => File.join(PROJECT_ROOT, 'Gemfile') },
    'bundle',
    'exec',
    QNI_BIN,
    *argv.drop(1),
    chdir: @scenario_dir
  )
end

ならば('コマンドは成功') do
  next if @status.success?

  raise <<~MESSAGE
    expected command to succeed, but it failed
    exit status: #{@status.exitstatus}
    stdout:
    #{@stdout}
    stderr:
    #{@stderr}
  MESSAGE
end

ならば('コマンドは失敗') do
  next unless @status.success?

  raise <<~MESSAGE
    expected command to fail, but it succeeded
    stdout:
    #{@stdout}
    stderr:
    #{@stderr}
  MESSAGE
end

ならば('標準出力は空') do
  next if @stdout.empty?

  raise <<~MESSAGE
    expected stdout to be empty
    actual stdout:
    #{@stdout}
  MESSAGE
end

ならば('標準出力:') do |doc_string|
  actual = @stdout.sub(/\n+\z/, '')
  next if actual == doc_string

  raise <<~MESSAGE
    expected stdout to match
    expected:
    #{doc_string}
    actual:
    #{actual}
  MESSAGE
end

ならば('標準出力に次を含む:') do |doc_string|
  next if @stdout.include?(doc_string)

  raise <<~MESSAGE
    expected stdout to include
    expected:
    #{doc_string}
    actual:
    #{@stdout}
  MESSAGE
end

ならば('標準出力に次を含まない:') do |doc_string|
  next unless @stdout.include?(doc_string)

  raise <<~MESSAGE
    expected stdout not to include
    unexpected:
    #{doc_string}
    actual:
    #{@stdout}
  MESSAGE
end

ならば('標準エラー:') do |doc_string|
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

ならば('{string} の内容:') do |path, doc_string|
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

ならば('{string} は存在しない') do |path|
  actual_path = File.join(@scenario_dir, path)
  next unless File.exist?(actual_path)

  raise <<~MESSAGE
    expected file not to exist: #{path}
  MESSAGE
end
