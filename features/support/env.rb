# frozen_string_literal: true

require 'fileutils'
require 'open3'
require 'shellwords'
require 'tmpdir'

PROJECT_ROOT = File.expand_path('../..', __dir__)
QNI_BIN = File.join(PROJECT_ROOT, 'bin', 'qni')

Before do
  @scenario_dir = Dir.mktmpdir('qni-cli-')
end

After do
  FileUtils.remove_entry(@scenario_dir) if @scenario_dir && Dir.exist?(@scenario_dir)
end
