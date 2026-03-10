# frozen_string_literal: true

require 'json'

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

ならば('標準出力は空') do
  next if @stdout.empty?

  raise <<~MESSAGE
    expected stdout to be empty
    actual stdout:
    #{@stdout}
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
