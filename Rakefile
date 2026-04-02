# frozen_string_literal: true

require 'cucumber/rake/task'
require 'flay_task'
require 'flog_task'
require 'rake/testtask'
require 'reek/rake/task'
require 'rubocop/rake_task'

desc 'Run RuboCop'
RuboCop::RakeTask.new(:rubocop) do |task|
  task.options = ['--cache-root', File.expand_path('tmp/rubocop-cache', __dir__)]
  task.patterns = ['Rakefile', 'bin/*', 'features/**/*.rb', 'lib/**/*.rb', 'test/**/*.rb']
end

desc 'Run Cucumber features'
Cucumber::Rake::Task.new(:cucumber)

desc 'Run Minitest tests'
Rake::TestTask.new(:test) do |task|
  task.libs << 'test'
  task.pattern = 'test/**/*_test.rb'
end

FlogTask.new(:flog, 20, %w[lib bin], :max_method, true) do |task|
  task.verbose = false
end

FlayTask.new(:flay, 20, %w[lib bin]) do |task|
  task.verbose = false
end

Reek::Rake::Task.new(:reek) do |task|
  task.config_file = '.reek.yml'
  task.source_files = FileList['lib/**/*.rb', 'bin/*']
  task.reek_opts = '--no-progress'
end

desc 'Run all checks'
task check: %i[rubocop flog flay reek cucumber test]

task default: :check
