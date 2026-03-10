# frozen_string_literal: true

require 'cucumber/rake/task'
require 'flay_task'
require 'flog_task'
require 'rubocop/rake_task'

desc 'Run RuboCop'
RuboCop::RakeTask.new(:rubocop) do |task|
  task.options = ['--cache-root', File.expand_path('tmp/rubocop-cache', __dir__)]
end

desc 'Run Cucumber features'
Cucumber::Rake::Task.new(:cucumber)

FlogTask.new(:flog, 20, %w[lib bin], :max_method) do |task|
  task.verbose = false
end

FlayTask.new(:flay, 20, %w[lib bin]) do |task|
  task.verbose = false
end

desc 'Run all checks'
task check: %i[rubocop flog flay cucumber]

task default: :check
