# Script for the Player Node
extends Node2D

@export var speed: float = 300.0
@export var dash_speed: float = 600.0
@export var dash_duration: float = 0.2
@onready var sprite: AnimatedSprite2D = $Sprite
@onready var tween: Tween = $Tween
@onready var audio_player: AudioStreamPlayer = $AudioStreamPlayer

enum State { IDLE, MOVING, DASHING }
var current_state: State = State.IDLE
var dash_timer: float = 0.0

func _process(delta: float) -> void:
    if current_state == State.DASHING:
        dash_timer -= delta
        if dash_timer <= 0:
            current_state = State.IDLE
            sprite.modulate = Color(1, 1, 1, 1)
        return
    
    var input_vector = Vector2.ZERO
    input_vector.x = Input.get_action_strength("ui_right") - Input.get_action_strength("ui_left")
    input_vector.y = Input.get_action_strength("ui_down") - Input.get_action_strength("ui_up")
    input_vector = input_vector.normalized()
    
    if Input.is_action_just_pressed("ui_dash") and current_state != State.DASHING:
        start_dash(input_vector)
    elif input_vector != Vector2.ZERO:
        move_and_slide(input_vector * speed)
        if current_state != State.MOVING:
            sprite.play("walk")
            current_state = State.MOVING
            audio_player.play()
    else:
        if current_state != State.IDLE:
            sprite.play("idle")
            current_state = State.IDLE
            audio_player.stop()

func start_dash(direction: Vector2) -> void:
    if direction != Vector2.ZERO:
        move_and_slide(direction * dash_speed)
        dash_effect()
        current_state = State.DASHING
        dash_timer = dash_duration

func dash_effect():
    tween.interpolate_property(sprite, "modulate", Color(1, 1, 1), Color(1, 1, 1, 0.5), dash_duration,
                               Tween.TRANS_LINEAR, Tween.EASE_IN_OUT)
    tween.start()