# frozen_string_literal: true

module Qni
  # Emits Kitty graphics protocol payloads to a writable IO object.
  class KittyGraphicsEmitter
    # Presents base64-encoded PNG bytes as kitty payload chunks with continuation flags.
    class PayloadChunks
      include Enumerable

      def initialize(png_bytes, chunk_size:)
        @encoded_png = [png_bytes].pack('m0')
        @chunk_size = chunk_size
      end

      def each
        return enum_for(:each) unless block_given?

        chunks.each_with_index do |chunk, index|
          yield chunk, more_chunks_flag(index)
        end
      end

      private

      attr_reader :encoded_png, :chunk_size

      def chunks
        @chunks ||= encoded_png.scan(/.{1,#{chunk_size}}/)
      end

      def more_chunks_flag(index)
        index < chunks.length - 1 ? 1 : 0
      end
    end

    APC_BEGIN = "\e_G"
    APC_END = "\e\\"
    PNG_FORMAT = 100
    CHUNK_SIZE = 4096
    DEFAULT_GAP_MS = 90

    def initialize(io:)
      @io = io
      @next_image_id = 1
    end

    def emit_png_frame(png_bytes)
      emit_payload("a=T,f=#{PNG_FORMAT}", png_bytes)
    end

    def emit_animation(png_frames, gap_ms: DEFAULT_GAP_MS)
      image_id = allocate_image_id
      emit_root_frame(image_id, png_frames.first)
      emit_control(image_id:, frame_number: 1, gap_ms:)
      emit_animation_frames(image_id, png_frames.drop(1), gap_ms)
      emit_animation_start(image_id:)
    end

    private

    attr_reader :io

    def allocate_image_id
      image_id = @next_image_id
      @next_image_id += 1
      image_id
    end

    def emit_animation_frames(image_id, png_frames, gap_ms)
      png_frames.each do |png_frame|
        emit_payload("a=f,f=#{PNG_FORMAT},i=#{image_id},z=#{gap_ms}", png_frame)
      end
    end

    def emit_payload(command, png_bytes)
      PayloadChunks.new(png_bytes, chunk_size: CHUNK_SIZE).each do |chunk, more_chunks|
        write_apc("#{command},m=#{more_chunks};#{chunk}")
      end
    end

    def emit_root_frame(image_id, png_bytes)
      emit_payload("a=T,f=#{PNG_FORMAT},i=#{image_id}", png_bytes)
    end

    def emit_animation_start(image_id:)
      emit_command("a=a,i=#{image_id},s=3,v=1")
    end

    def emit_control(image_id:, frame_number:, gap_ms:)
      emit_command("a=a,i=#{image_id},r=#{frame_number},z=#{gap_ms}")
    end

    def emit_command(command)
      write_apc(command)
    end

    def write_apc(command)
      io.write("#{APC_BEGIN}#{command}#{APC_END}")
      io.flush
    end
  end
end
